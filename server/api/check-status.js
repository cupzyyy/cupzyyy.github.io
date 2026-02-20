// ============================================================
//  API: CHECK STATUS + LINK DELIVERY
// ============================================================

const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";
const PAKASIR_BASE = "https://app.pakasir.com/api";

let orderStore;
try {
    const createOrder = require("./create-order");
    orderStore = createOrder.orderStore;
} catch (e) {
    orderStore = new Map();
}

function normalizeStatus(rawStatus) {
    if (!rawStatus || typeof rawStatus !== "string") return "pending";
    const status = rawStatus.toLowerCase().trim();
    
    if (["paid", "success", "settlement", "completed"].includes(status)) return "paid";
    if (["expired", "expire"].includes(status)) return "expired";
    if (["failed", "fail", "error"].includes(status)) return "failed";
    if (["cancel", "cancelled", "canceled"].includes(status)) return "cancelled";
    
    return "pending";
}

function processAutoDeliver(orderId) {
    if (!orderStore?.has(orderId)) return;
    
    const order = orderStore.get(orderId);
    if (order.status === "delivered") return;

    console.log("");
    console.log("╔═══════════════════════════════════════╗");
    console.log("║     🚀 DELIVERING DOWNLOAD LINK...     ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log(`[DELIVER] Order: ${orderId}`);
    console.log(`[DELIVER] Product: ${order.product_name}`);
    console.log(`[DELIVER] Link: ${order.download_link}`);

    order.status = "delivered";
    order.delivered_at = new Date().toISOString();
    order.delivery_message = `Terima kasih ${order.buyer_name}! Berikut link download ${order.product_name}: ${order.download_link}`;

    orderStore.set(orderId, order);

    console.log(`✅ DELIVERED: ${orderId}`);
}

async function checkStatusHandler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
        const orderId = (req.body.order_id || "").trim();
        if (!orderId) return res.json({ ok: false, error: "Order ID diperlukan" });

        const order = orderStore.get(orderId);
        if (!order) return res.json({ ok: false, error: "Order tidak ditemukan" });

        // Return cached final status
        if (order.status === "delivered") {
            return res.json({ ok: true, status: "delivered", order: order });
        }
        if (order.status === "paid") {
            setTimeout(() => processAutoDeliver(orderId), 1000);
            return res.json({ ok: true, status: "paid", order: order });
        }
        if (["expired", "failed", "cancelled"].includes(order.status)) {
            return res.json({ ok: true, status: order.status, order: order });
        }

        // Check with Pakasir
        const pakasirUrl = new URL(`${PAKASIR_BASE}/transactiondetail`);
        pakasirUrl.searchParams.set("project", PROJECT_SLUG);
        pakasirUrl.searchParams.set("amount", String(order.total_amount));
        pakasirUrl.searchParams.set("order_id", orderId);
        pakasirUrl.searchParams.set("api_key", API_KEY);

        const response = await fetch(pakasirUrl.toString(), {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        const data = await response.json();
        const transaction = data.transaction || data;
        const normalizedStatus = normalizeStatus(transaction.status);

        if (normalizedStatus === "paid") {
            order.status = "paid";
            order.paid_at = new Date().toISOString();
            orderStore.set(orderId, order);
            
            setTimeout(() => processAutoDeliver(orderId), 2000);
            
            return res.json({ ok: true, status: "paid", order: order });
        }

        if (["expired", "failed", "cancelled"].includes(normalizedStatus)) {
            order.status = normalizedStatus;
            orderStore.set(orderId, order);
            return res.json({ ok: true, status: normalizedStatus, order: order });
        }

        return res.json({ ok: true, status: "pending", order: order });

    } catch (error) {
        console.error("❌ CHECK STATUS ERROR:", error.message);
        return res.json({ ok: true, status: "pending" });
    }
}

module.exports = checkStatusHandler;
module.exports.processAutoDeliver = processAutoDeliver;
module.exports.normalizeStatus = normalizeStatus;
