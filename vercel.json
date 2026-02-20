// POST /api/webhook
const { orderStore } = require('./create-order.js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const body = req.body;
        const orderId = body.order_id || body.orderId;
        
        console.log('[WEBHOOK]', orderId, body.status);
        
        if (orderId && orderStore.has(orderId)) {
            const order = orderStore.get(orderId);
            const status = (body.status || "").toLowerCase();
            
            if (["paid", "success"].includes(status) && order.status === "pending") {
                order.status = "delivered";
                order.paid_at = new Date().toISOString();
                order.delivered_at = new Date().toISOString();
                orderStore.set(orderId, order);
                console.log('[WEBHOOK] Delivered:', orderId);
            }
        }
        
        return res.json({ received: true });
    } catch (e) {
        return res.json({ received: true });
    }
};
