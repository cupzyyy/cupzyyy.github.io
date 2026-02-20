// api/create-order.js
const crypto = require('crypto');

// Config untuk Pakasir
const PROJECT_SLUG = process.env.PROJECT_SLUG || 'cupzyyy';
const API_KEY = process.env.API_KEY || 'x5ex44h3cexOAvi37EOEKMlFvRPsGa3f';
const PAKASIR_BASE = 'https://app.pakasir.com/api';

// Produk
const PRODUCTS = [
    {
        id: 'body-hs-100',
        name: 'BODY HS 100%',
        description: 'Work di semua device',
        price: 15000,
        icon: '💪',
        download_link: 'https://www.mediafire.com/file/596olv21y0l21ja/body-hs-100.zip/file'
    },
    {
        id: 'headlock-97',
        name: 'HEADLOCK 97%',
        description: 'Work di semua device',
        price: 10000,
        icon: '🔒',
        download_link: 'https://www.mediafire.com/file/596olv21y0l21ja/headlock-97.zip/file'
    }
];

// In-memory store (Vercel: akan hilang setelah request selesai)
// Untuk production, pakai database seperti MongoDB, Firebase, atau Vercel KV
const orderStore = new Map();

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            ok: false,
            error: 'Method not allowed. Use POST.'
        });
    }

    try {
        const { product_id, buyer_email, buyer_name, quantity = 1 } = req.body;

        // Validasi product
        const product = PRODUCTS.find(p => p.id === product_id);
        if (!product) {
            return res.status(400).json({ ok: false, error: 'Produk tidak ditemukan' });
        }

        // Validasi email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(buyer_email)) {
            return res.status(400).json({ ok: false, error: 'Email tidak valid' });
        }

        // Hitung total
        const total = product.price * quantity;

        // Generate order ID
        const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // Panggil API Pakasir
        const response = await fetch(`${PAKASIR_BASE}/transactioncreate/qris`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: PROJECT_SLUG,
                order_id: orderId,
                amount: total,
                api_key: API_KEY
            })
        });

        const data = await response.json();

        if (!data.payment?.payment_number) {
            return res.status(500).json({ ok: false, error: 'Gagal membuat QRIS' });
        }

        // Ekstrak QRIS
        let qrisString = data.payment.payment_number;
        if (!qrisString.startsWith('00020101')) {
            const idx = qrisString.indexOf('00020101');
            qrisString = idx !== -1 ? qrisString.substring(idx) : qrisString;
        }

        // Simpan order (di memory - akan hilang setelah request)
        // Untuk production, simpan di database
        const orderData = {
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            product_icon: product.icon,
            download_link: product.download_link,
            quantity,
            unit_price: product.price,
            total_amount: total,
            buyer_email,
            buyer_name: buyer_name || 'Customer',
            qris: qrisString,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Simpan di global object (hanya bertahan selama runtime Vercel)
        if (!global.orderStore) global.orderStore = new Map();
        global.orderStore.set(orderId, orderData);

        return res.json({
            ok: true,
            order_id: orderId,
            product_name: product.name,
            product_icon: product.icon,
            quantity,
            total_amount: total,
            total_payment: data.payment.total_payment || total,
            qris: qrisString,
            buyer_email
        });

    } catch (error) {
        console.error('Create order error:', error);
        return res.status(500).json({
            ok: false,
            error: 'Server error. Silakan coba lagi.'
        });
    }
};