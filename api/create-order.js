// Vercel Serverless Function - Create Order
// Endpoint: POST /api/create-order

const crypto = require("crypto");

// Config (gunakan Environment Variables di Vercel Dashboard)
const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";
const PAKASIR_BASE = "https://app.pakasir.com/api";

// 2 Produk
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

// Simple in-memory store (Vercel: akan reset tiap cold start)
const orderStore = new Map();

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

function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function sanitize(str) {
    if (!str || typeof str !== "string") return "";
    return str.replace(/[<>"'&]/g, "").trim().substring(0, 200);
}

// Export untuk digunakan handler lain
module.exports.PRODUCTS = PRODUCTS;
module.exports.orderStore = orderStore;

// Main Handler
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        const { product_id, buyer_email, buyer_name, quantity = 1 } = req.body;
        
        const cleanProductId = sanitize(product_id);
        const cleanEmail = sanitize(buyer_email);
        const cleanName = sanitize(buyer_name) || "Guest";
        const qty = parseInt(quantity) || 1;

        // Validation
        if (!cleanProductId) return res.json({ ok: false, error: "Pilih produk" });
        if (!isValidEmail(cleanEmail)) return res.json({ ok: false, error: "Email tidak valid" });
        if (qty < 1 || qty > 99) return res.json({ ok: false, error: "Jumlah 1-99" });

        const product = PRODUCTS.find(p => p.id === cleanProductId);
        if (!product) return res.json({ ok: false, error: "Produk tidak ditemukan" });

        const totalAmount = product.price * qty;
        const orderId = generateOrderId("ORD");

        console.log(`[ORDER] ${product.name} | Rp${totalAmount} | ${orderId}`);

        // Call Pakasir API
        const fetch = (await import('node-fetch')).default;
        
        const pakasirRes = await fetch(`${PAKASIR_BASE}/transactioncreate/qris`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: PROJECT_SLUG,
                order_id: orderId,
                amount: totalAmount,
                api_key: API_KEY
            })
        });

        const pakasirData = await pakasirRes.json();
        const payment = pakasirData.payment;

        if (!payment?.payment_number) {
            return res.json({ ok: false, error: "Gagal membuat QRIS" });
        }

        const qris = extractQris(payment.payment_number);
        if (!qris) return res.json({ ok: false, error: "QRIS tidak valid" });

        // Save order
        const orderData = {
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            product_icon: product.icon,
            download_link: product.download_link,
            quantity: qty,
            unit_price: product.price,
            total_amount: totalAmount,
            total_payment: payment.total_payment || totalAmount,
            fee: payment.fee || 0,
            buyer_email: cleanEmail,
            buyer_name: cleanName,
            qris: qris,
            status: "pending",
            created_at: new Date().toISOString(),
            expired_at: payment.expired_at || null
        };

        orderStore.set(orderId, orderData);

        return res.json({
            ok: true,
            order_id: orderId,
            product_name: product.name,
            product_icon: product.icon,
            quantity: qty,
            total_amount: totalAmount,
            total_payment: orderData.total_payment,
            fee: orderData.fee,
            qris: qris,
            expired_at: orderData.expired_at,
            buyer_email: cleanEmail,
            buyer_name: cleanName
        });

    } catch (error) {
        console.error('Error:', error);
        return res.json({ ok: false, error: "Server error" });
    }
};
