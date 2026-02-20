// ============================================================
//  API: CREATE ORDER + QRIS PAYMENT (2 PRODUK + LINK DELIVERY)
// ============================================================

const crypto = require("crypto");

const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";
const PAKASIR_BASE = "https://app.pakasir.com/api";

// ==================== 2 PRODUK ONLY ====================
const PRODUCTS = [
    {
        id: "body-hs",
        name: "BODY HS 100%",
        description: "Work di semua device",
        price: 15000,
        icon: "🎯",
        category: "digital",
        stock: 999,
        popular: true,
        download_link: "https://www.mediafire.com/file/596olv21y0l21ja/"
    },
    {
        id: "headlock-97",
        name: "HEADLOCK 97%",
        description: "Work di semua device",
        price: 10000,
        icon: "🔒",
        category: "digital",
        stock: 999,
        popular: false,
        download_link: "https://www.mediafire.com/file/596olv21y0l21ja/"
    }
];

function generateOrderId(prefix = "ORD") {
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${timestamp}-${randomHex}`;
}

function extractQris(str) {
    if (!str) return null;
    if (str.startsWith("00020101")) return str;
    const idx = str.indexOf("00020101");
    if (idx !== -1) return str.substring(idx);
    return null;
}

function formatRupiah(num) {
    return "Rp " + Number(num).toLocaleString("id-ID");
}

function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

function findProduct(productId) {
    if (!productId || typeof productId !== "string") return null;
    return PRODUCTS.find(p => p.id === productId) || null;
}

function sanitize(str) {
    if (!str || typeof str !== "string") return "";
    return str.replace(/[<>"'&]/g, "").trim().substring(0, 200);
}

const orderStore = new Map();

async function createOrderHandler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    }

    try {
        const productId = sanitize(req.body.product_id);
        const buyerEmail = sanitize(req.body.buyer_email);
        const buyerName = sanitize(req.body.buyer_name) || "Guest";
        const quantity = parseInt(req.body.quantity) || 1;

        console.log("");
        console.log("╔═══════════════════════════════════════╗");
        console.log("║      📦 NEW ORDER REQUEST              ║");
        console.log("╚═══════════════════════════════════════╝");
        console.log(`[INPUT] Product: ${productId}`);
        console.log(`[INPUT] Email: ${buyerEmail}`);
        console.log(`[INPUT] Name: ${buyerName}`);

        if (!productId || !isValidEmail(buyerEmail) || quantity < 1 || quantity > 99) {
            return res.json({ ok: false, error: "Data tidak valid" });
        }

        const product = findProduct(productId);
        if (!product) return res.json({ ok: false, error: "Produk tidak ditemukan" });

        const totalAmount = product.price * quantity;
        const orderId = generateOrderId("ORD");

        console.log(`[ORDER] ${product.name} | ${formatRupiah(totalAmount)} | ID: ${orderId}`);

        // Call Pakasir API
        const pakasirPayload = {
            project: PROJECT_SLUG,
            order_id: orderId,
            amount: totalAmount,
            api_key: API_KEY
        };

        const pakasirResponse = await fetch(`${PAKASIR_BASE}/transactioncreate/qris`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(pakasirPayload)
        });

        const pakasirJson = await pakasirResponse.json();
        const payment = pakasirJson.payment;

        if (!payment?.payment_number) {
            return res.json({ ok: false, error: "Gagal membuat QRIS" });
        }

        const qris = extractQris(payment.payment_number);
        if (!qris) return res.json({ ok: false, error: "QRIS tidak valid" });

        const orderData = {
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            product_icon: product.icon,
            product_description: product.description,
            download_link: product.download_link,
            quantity: quantity,
            unit_price: product.price,
            total_amount: totalAmount,
            total_payment: payment.total_payment || totalAmount,
            fee: payment.fee || 0,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            qris: qris,
            status: "pending",
            created_at: new Date().toISOString(),
            expired_at: payment.expired_at || null,
            paid_at: null,
            delivered_at: null,
            delivery_code: null
        };

        orderStore.set(orderId, orderData);

        console.log(`✅ ORDER CREATED: ${orderId}`);

        return res.json({
            ok: true,
            order_id: orderId,
            product_name: product.name,
            product_icon: product.icon,
            product_description: product.description,
            quantity: quantity,
            unit_price: product.price,
            total_amount: totalAmount,
            total_payment: orderData.total_payment,
            fee: orderData.fee,
            qris: qris,
            expired_at: orderData.expired_at,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            created_at: orderData.created_at
        });

    } catch (error) {
        console.error("❌ CREATE ORDER ERROR:", error.message);
        return res.json({ ok: false, error: "Server error" });
    }
}

module.exports = createOrderHandler;
module.exports.orderStore = orderStore;
module.exports.PRODUCTS = PRODUCTS;
module.exports.findProduct = findProduct;
module.exports.extractQris = extractQris;
module.exports.formatRupiah = formatRupiah;
