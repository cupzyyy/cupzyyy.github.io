// ============================================================
//  API: WEBHOOK RECEIVER
//  Endpoint: POST /api/webhook
//  Receives payment notifications from Pakasir
// ============================================================

const crypto = require("crypto");

// ==================== CONFIG ====================
const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

// ==================== IMPORT SHARED MODULES ====================
let orderStore;
let processAutoDeliver;
let normalizeStatus;

try {
    const createOrder = require("./create-order");
    orderStore = createOrder.orderStore;

    const checkStatus = require("./check-status");
    processAutoDeliver = checkStatus.processAutoDeliver;
    normalizeStatus = checkStatus.normalizeStatus;

} catch (e) {
    console.error("[WEBHOOK] Failed to import modules:", e.message);
    orderStore = new Map();
    processAutoDeliver = () => { };
    normalizeStatus = (s) => (s || "pending").toLowerCase();
}

// ==================== HELPER FUNCTIONS ====================

function formatRupiah(num) {
    return "Rp " + Number(num).toLocaleString("id-ID");
}

function verifySignature(payload, signature) {
    if (!WEBHOOK_SECRET || !signature) {
        return true;
    }

    try {
        const expectedSignature = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest("hex");

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

    } catch (e) {
        console.error("[WEBHOOK] Signature verification error:", e.message);
        return false;
    }
}

function getClientIp(req) {
    return req.headers["x-forwarded-for"] ||
        req.headers["x-real-ip"] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        "unknown";
}

function logWebhookEvent(event, data) {
    const timestamp = new Date().toISOString();
    console.log(`[WEBHOOK][${timestamp}] ${event}:`, typeof data === "object" ? JSON.stringify(data) : data);
}

// ==================== WEBHOOK HISTORY ====================
const webhookHistory = [];
const MAX_WEBHOOK_HISTORY = 100;

function saveWebhookHistory(entry) {
    webhookHistory.unshift(entry);
    if (webhookHistory.length > MAX_WEBHOOK_HISTORY) {
        webhookHistory.pop();
    }
}

// ==================== MAIN HANDLER ====================

async function webhookHandler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Method not allowed. Webhook only accepts POST."
        });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const contentType = req.headers["content-type"] || "unknown";
    const signature = req.headers["x-webhook-signature"] ||
        req.headers["x-pakasir-signature"] || "";

    const receivedAt = new Date().toISOString();

    console.log("");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║     📨 WEBHOOK RECEIVED                ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log(`[WEBHOOK] Time: ${receivedAt}`);
    console.log(`[WEBHOOK] IP: ${clientIp}`);
    console.log(`[WEBHOOK] UA: ${userAgent}`);
    console.log(`[WEBHOOK] Content-Type: ${contentType}`);

    try {
        const body = req.body || {};

        logWebhookEvent("BODY", body);

        if (WEBHOOK_SECRET && signature) {
            const isValid = verifySignature(body, signature);
            if (!isValid) {
                console.error("[WEBHOOK] ❌ Invalid signature! Possible spoofing.");
                saveWebhookHistory({
                    received_at: receivedAt,
                    ip: clientIp,
                    body: body,
                    result: "REJECTED - Invalid signature"
                });
                return res.json({ received: true, valid: false });
            }
            console.log("[WEBHOOK] ✅ Signature verified");
        }

        const orderId = body.order_id || body.orderId || body.id || "";
        const rawStatus = body.status || body.payment_status || "";
        const amount = parseInt(body.amount || body.total_amount || 0);
        const project = body.project || body.project_slug || "";

        console.log(`[WEBHOOK] Order ID: ${orderId}`);
        console.log(`[WEBHOOK] Status: ${rawStatus}`);
        console.log(`[WEBHOOK] Amount: ${amount}`);
        console.log(`[WEBHOOK] Project: ${project}`);

        if (project && project !== PROJECT_SLUG) {
            console.log(`[WEBHOOK] ⚠️ Project mismatch: expected "${PROJECT_SLUG}", got "${project}"`);
            saveWebhookHistory({
                received_at: receivedAt,
                ip: clientIp,
                body: body,
                result: "IGNORED - Project mismatch"
            });
            return res.json({ received: true });
        }

        if (orderId && orderStore.has(orderId)) {
            const order = orderStore.get(orderId);
            const newStatus = normalizeStatus(rawStatus);

            console.log(`[WEBHOOK] Found order: ${orderId}`);
            console.log(`[WEBHOOK] Current status: ${order.status}`);
            console.log(`[WEBHOOK] New status: ${newStatus}`);

            if (order.status === "pending" || order.status !== newStatus) {

                if (newStatus === "paid") {
                    console.log("");
                    console.log("╔═══════════════════════════════════════╗");
                    console.log("║   💰 PAYMENT CONFIRMED VIA WEBHOOK!   ║");
                    console.log("╚═══════════════════════════════════════╝");
                    console.log(`[PAID] Order: ${orderId}`);
                    console.log(`[PAID] Amount: ${formatRupiah(order.total_amount)}`);
                    console.log(`[PAID] Product: ${order.product_name}`);
                    console.log(`[PAID] Buyer: ${order.buyer_email}`);

                    order.status = "paid";
                    order.paid_at = new Date().toISOString();
                    orderStore.set(orderId, order);

                    console.log("[WEBHOOK] Triggering auto delivery...");
                    setTimeout(() => {
                        try {
                            processAutoDeliver(orderId);
                        } catch (e) {
                            console.error("[WEBHOOK] Auto deliver error:", e.message);
                        }
                    }, 1500);

                    saveWebhookHistory({
                        received_at: receivedAt,
                        ip: clientIp,
                        order_id: orderId,
                        old_status: "pending",
                        new_status: "paid",
                        amount: order.total_amount,
                        result: "PROCESSED - Payment confirmed, auto delivering"
                    });
                }

                else if (newStatus === "expired") {
                    console.log(`[WEBHOOK] ⏰ Order expired: ${orderId}`);

                    order.status = "expired";
                    orderStore.set(orderId, order);

                    saveWebhookHistory({
                        received_at: receivedAt,
                        ip: clientIp,
                        order_id: orderId,
                        old_status: order.status,
                        new_status: "expired",
                        result: "PROCESSED - Order expired"
                    });
                }

                else if (newStatus === "failed" || newStatus === "cancelled") {
                    console.log(`[WEBHOOK] ❌ Order ${newStatus}: ${orderId}`);

                    order.status = newStatus;
                    orderStore.set(orderId, order);

                    saveWebhookHistory({
                        received_at: receivedAt,
                        ip: clientIp,
                        order_id: orderId,
                        old_status: order.status,
                        new_status: newStatus,
                        result: `PROCESSED - Order ${newStatus}`
                    });
                }

                else {
                    console.log(`[WEBHOOK] ℹ️ Unknown status "${newStatus}" for order ${orderId}`);

                    saveWebhookHistory({
                        received_at: receivedAt,
                        ip: clientIp,
                        order_id: orderId,
                        raw_status: rawStatus,
                        normalized: newStatus,
                        result: "IGNORED - Unknown status"
                    });
                }
            } else {
                console.log(`[WEBHOOK] ℹ️ No status change for ${orderId} (already ${order.status})`);

                saveWebhookHistory({
                    received_at: receivedAt,
                    ip: clientIp,
                    order_id: orderId,
                    status: order.status,
                    result: "IGNORED - No status change"
                });
            }
        } else if (orderId) {
            console.log(`[WEBHOOK] ⚠️ Order not found in store: ${orderId}`);

            saveWebhookHistory({
                received_at: receivedAt,
                ip: clientIp,
                order_id: orderId,
                result: "IGNORED - Order not found"
            });
        } else {
            console.log("[WEBHOOK] ⚠️ No order_id in webhook payload");

            saveWebhookHistory({
                received_at: receivedAt,
                ip: clientIp,
                body: body,
                result: "IGNORED - No order_id"
            });
        }

    } catch (error) {
        console.error("");
        console.error("❌ WEBHOOK PROCESSING ERROR:");
        console.error("   Message:", error.message);
        console.error("   Stack:", error.stack);
        console.error("");

        saveWebhookHistory({
            received_at: receivedAt,
            ip: clientIp,
            error: error.message,
            result: "ERROR"
        });
    }

    console.log("[WEBHOOK] ✅ Response sent: { received: true }");
    console.log("");

    return res.json({ received: true });
}

// ==================== WEBHOOK HISTORY ENDPOINT ====================
webhookHandler.getHistory = function (req, res) {
    return res.json({
        ok: true,
        total: webhookHistory.length,
        history: webhookHistory
    });
};

module.exports = webhookHandler;
module.exports.webhookHistory = webhookHistory;
