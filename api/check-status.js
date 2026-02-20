// Vercel Serverless - Check Status
// POST /api/check-status

const { orderStore, PRODUCTS } = require('./create-order.js');

const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";
const PAKASIR_BASE = "https://app.pakasir.com/api";

function normalizeStatus(raw) {
    if (!raw) return "pending";
    const s = raw.toLowerCase();
    if (["paid", "success", "settlement"].includes(s)) return "paid";
    if (s === "expired") return "expired";
    if (["failed", "fail"].includes(s)) return "failed";
    if (["cancel", "cancelled"].includes(s)) return "cancelled";
    return "pending";
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false });

    try {
        const { order_id } = req.body;
        if (!order_id) return res.json({ ok: false, error: "Order ID required" });

        const order = orderStore.get(order_id);
        if (!order) return res.json({ ok: false, error: "Order not found" });

        // Return cached if final
        if (["delivered", "expired", "failed", "cancelled"].includes(order.status)) {
            return res.json({ ok: true, status: order.status, order });
        }

        if (order.status === "paid") {
            order.status = "delivered";
            order.delivered_at = new Date().toISOString();
            orderStore.set(order_id, order);
            return res.json({ ok: true, status: "delivered", order });
        }

        // Check Pakasir
        const fetch = (await import('node-fetch')).default;
        const url = `${PAKASIR_BASE}/transactiondetail?project=${PROJECT_SLUG}&amount=${order.total_amount}&order_id=${order_id}&api_key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const rawStatus = (data.transaction || data).status || "pending";
        const status = normalizeStatus(rawStatus);

        if (status === "paid") {
            order.status = "delivered";
            order.paid_at = new Date().toISOString();
            order.delivered_at = new Date().toISOString();
            orderStore.set(order_id, order);
            return res.json({ ok: true, status: "delivered", order });
        }

        if (["expired", "failed", "cancelled"].includes(status)) {
            order.status = status;
            orderStore.set(order_id, order);
            return res.json({ ok: true, status, order });
        }

        return res.json({ ok: true, status: "pending", order });

    } catch (error) {
        console.error('Error:', error);
        return res.json({ ok: true, status: "pending" });
    }
};
