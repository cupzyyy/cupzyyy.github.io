// api/check-status.js
const PROJECT_SLUG = process.env.PROJECT_SLUG || 'cupzyyy';
const API_KEY = process.env.API_KEY || 'x5ex44h3cexOAvi37EOEKMlFvRPsGa3f';
const PAKASIR_BASE = 'https://app.pakasir.com/api';

module.exports = async (req, res) => {
    // Set CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Use POST' });
    }

    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.json({ ok: false, error: 'Order ID required' });
        }

        // Ambil dari global store
        const order = global.orderStore?.get(order_id);

        if (!order) {
            return res.json({ ok: false, error: 'Order not found' });
        }

        // Cek status ke Pakasir
        const url = new URL(`${PAKASIR_BASE}/transactiondetail`);
        url.searchParams.set('project', PROJECT_SLUG);
        url.searchParams.set('order_id', order_id);
        url.searchParams.set('api_key', API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();

        const transaction = data.transaction || data;
        const rawStatus = transaction.status || 'pending';

        // Normalize status
        let status = 'pending';
        const s = rawStatus.toLowerCase();
        if (['paid', 'success', 'settlement', 'completed'].includes(s)) status = 'paid';
        if (['expired', 'expire'].includes(s)) status = 'expired';
        if (['failed', 'fail', 'error'].includes(s)) status = 'failed';

        // Update status di store
        if (status !== order.status) {
            order.status = status;
            if (status === 'paid') {
                order.paid_at = new Date().toISOString();
            }
            global.orderStore.set(order_id, order);
        }

        // Response
        return res.json({
            ok: true,
            status: order.status,
            order: {
                ...order,
                download_link: order.download_link
            }
        });

    } catch (error) {
        console.error('Check status error:', error);
        return res.json({ ok: true, status: 'pending' });
    }
};