// =============================================
// WEBHOOK RECEIVER - PAKASIR PAYMENT
// VERCEL SERVERLESS FUNCTION
// =============================================

// ========== CONFIG ==========
const PROJECT_SLUG = process.env.PROJECT_SLUG || 'cupzyyy';
const API_KEY = process.env.API_KEY || 'x5ex44h3cexOAvi37EOEKMlFvRPsGa3f';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''; // Optional, untuk verifikasi signature

// ========== IN-MEMORY STORE (Vercel) ==========
// Note: Ini akan hilang saat Vercel melakukan cold start
// Untuk production, gunakan database persisten seperti Vercel KV, MongoDB, dll
let orderStore = new Map();

// Coba ambil dari global (bertahan selama runtime Vercel)
if (!global.orderStore) {
    global.orderStore = new Map();
}
orderStore = global.orderStore;

// ========== WEBHOOK HISTORY (untuk debugging) ==========
const webhookHistory = [];
const MAX_HISTORY = 50;

// ========== HELPER FUNCTIONS ==========

/**
 * Format Rupiah
 */
function formatRupiah(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

/**
 * Normalize status dari Pakasir
 */
function normalizeStatus(status) {
    if (!status) return 'pending';
    
    const s = status.toLowerCase().trim();
    
    // Status PAID
    if (['paid', 'success', 'settlement', 'completed'].includes(s)) {
        return 'paid';
    }
    
    // Status EXPIRED
    if (['expired', 'expire', 'timeout'].includes(s)) {
        return 'expired';
    }
    
    // Status FAILED
    if (['failed', 'fail', 'error', 'denied', 'rejected'].includes(s)) {
        return 'failed';
    }
    
    // Status CANCELLED
    if (['cancel', 'cancelled', 'canceled', 'void'].includes(s)) {
        return 'cancelled';
    }
    
    // Status REFUND
    if (['refund', 'refunded'].includes(s)) {
        return 'refunded';
    }
    
    return 'pending';
}

/**
 * Get client IP dari request
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
}

/**
 * Verify webhook signature (jika Pakasir menyediakan)
 */
function verifySignature(payload, signature) {
    if (!WEBHOOK_SECRET || !signature) {
        // Jika tidak ada secret, skip verification
        return true;
    }
    
    try {
        const crypto = require('crypto');
        const expected = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    } catch (e) {
        console.error('Signature verification error:', e.message);
        return false;
    }
}

/**
 * Auto deliver product setelah payment confirmed
 */
function processAutoDeliver(orderId) {
    if (!orderStore || !orderStore.has(orderId)) {
        console.log(`[WEBHOOK] Order ${orderId} not found for delivery`);
        return null;
    }

    const order = orderStore.get(orderId);

    // Skip if already delivered
    if (order.status === 'delivered') {
        console.log(`[WEBHOOK] Order ${orderId} already delivered`);
        return order;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🚀 AUTO DELIVERING PRODUCT (VIA WEBHOOK)');
    console.log('='.repeat(60));
    console.log(`Order ID: ${orderId}`);
    console.log(`Product: ${order.product_name}`);
    console.log(`Buyer: ${order.buyer_email}`);
    console.log(`Amount: ${formatRupiah(order.total_amount)}`);

    // Update status
    order.status = 'delivered';
    order.delivered_at = new Date().toISOString();

    // Generate delivery code
    const crypto = require('crypto');
    const deliveryCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    order.delivery_code = deliveryCode;

    // Get download link (dari produk yang sudah disimpan)
    const downloadLink = order.download_link || '#';
    
    // Create delivery message
    order.delivery_message = `
✅ PEMBAYARAN BERHASIL (VIA WEBHOOK)!
        
Produk: ${order.product_name}
Jumlah: ${order.quantity}
Total: ${formatRupiah(order.total_amount)}
        
📥 LINK DOWNLOAD:
${downloadLink}
        
Kode Download: ${deliveryCode}
        
Simpan link ini untuk mengunduh produk.
Terima kasih telah berbelanja!
    `.trim();

    // Simpan ke store
    orderStore.set(orderId, order);

    console.log('\n✅ DELIVERY SUCCESS!');
    console.log(`Download Link: ${downloadLink}`);
    console.log(`Delivery Code: ${deliveryCode}`);
    console.log('='.repeat(60) + '\n');

    return order;
}

// =============================================
// MAIN WEBHOOK HANDLER
// =============================================
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Signature');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            ok: false, 
            error: 'Method not allowed. Webhook only accepts POST.' 
        });
    }

    // Get request info
    const timestamp = new Date().toISOString();
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const signature = req.headers['x-webhook-signature'] || 
                      req.headers['x-pakasir-signature'] || 
                      '';

    console.log('\n' + '='.repeat(60));
    console.log('📨 WEBHOOK RECEIVED');
    console.log('='.repeat(60));
    console.log(`Time: ${timestamp}`);
    console.log(`IP: ${clientIp}`);
    console.log(`User-Agent: ${userAgent}`);
    console.log(`Signature: ${signature ? 'Present' : 'None'}`);

    try {
        // Parse body
        const body = req.body || {};
        console.log('\n📦 Webhook Payload:');
        console.log(JSON.stringify(body, null, 2).substring(0, 500));

        // Verify signature (optional)
        if (WEBHOOK_SECRET && signature) {
            const isValid = verifySignature(body, signature);
            if (!isValid) {
                console.error('❌ Invalid webhook signature! Possible spoofing attempt.');
                
                // Save to history
                webhookHistory.unshift({
                    timestamp,
                    ip: clientIp,
                    error: 'Invalid signature',
                    body: body
                });
                
                if (webhookHistory.length > MAX_HISTORY) {
                    webhookHistory.pop();
                }
                
                // Tetap return 200 untuk mencegah retry flooding
                return res.status(200).json({ 
                    received: true, 
                    verified: false,
                    message: 'Webhook received but signature invalid'
                });
            }
            console.log('✅ Webhook signature verified');
        }

        // Extract data from webhook
        // Pakasir mungkin mengirim dalam format berbeda
        const orderId = body.order_id || body.orderId || body.id || body.reference_id || '';
        const rawStatus = body.status || body.payment_status || body.transaction_status || '';
        const amount = parseInt(body.amount || body.total_amount || body.price || 0);
        const project = body.project || body.project_slug || body.merchant || '';
        
        console.log('\n📊 Extracted Data:');
        console.log(`Order ID: ${orderId}`);
        console.log(`Status: ${rawStatus}`);
        console.log(`Amount: ${amount}`);
        console.log(`Project: ${project}`);

        // Validate project slug (optional)
        if (project && project !== PROJECT_SLUG) {
            console.log(`⚠️ Project mismatch: expected "${PROJECT_SLUG}", got "${project}"`);
            // Tetap lanjutkan, mungkin order dari project lain
        }

        // Process order update
        if (orderId) {
            console.log(`\n🔍 Looking for order: ${orderId}`);
            
            // Cek di orderStore
            const order = orderStore.get(orderId);
            
            if (order) {
                console.log('✅ Order found in store');
                console.log(`Current status: ${order.status}`);
                
                const newStatus = normalizeStatus(rawStatus);
                console.log(`Normalized status: ${rawStatus} -> ${newStatus}`);

                // Only process if status is paid and order is pending
                if (order.status === 'pending' && newStatus === 'paid') {
                    console.log('\n💰 PAYMENT CONFIRMED VIA WEBHOOK!');
                    
                    // Update order status
                    order.status = 'paid';
                    order.paid_at = new Date().toISOString();
                    order.paid_via = 'webhook';
                    order.webhook_received_at = timestamp;
                    
                    // Simpan ke store
                    orderStore.set(orderId, order);
                    
                    console.log(`Order updated: pending -> paid`);

                    // Auto deliver product
                    console.log('\n📦 Triggering auto delivery...');
                    const deliveredOrder = processAutoDeliver(orderId);

                    // Save to history
                    webhookHistory.unshift({
                        timestamp,
                        ip: clientIp,
                        order_id: orderId,
                        old_status: 'pending',
                        new_status: 'paid',
                        delivered: true,
                        amount: order.total_amount,
                        product: order.product_name
                    });

                    console.log('\n✅ Webhook processed successfully!');
                }
                else if (order.status === 'pending' && ['expired', 'failed', 'cancelled'].includes(newStatus)) {
                    console.log(`\n❌ Payment ${newStatus} via webhook`);
                    
                    order.status = newStatus;
                    order.updated_at = new Date().toISOString();
                    order.webhook_received_at = timestamp;
                    
                    orderStore.set(orderId, order);
                    
                    webhookHistory.unshift({
                        timestamp,
                        ip: clientIp,
                        order_id: orderId,
                        old_status: 'pending',
                        new_status: newStatus,
                        amount: order.total_amount
                    });
                }
                else if (order.status === 'paid' && newStatus === 'paid') {
                    console.log('⚠️ Order already paid, skipping duplicate webhook');
                    
                    webhookHistory.unshift({
                        timestamp,
                        ip: clientIp,
                        order_id: orderId,
                        status: 'already_paid',
                        message: 'Duplicate webhook'
                    });
                }
                else {
                    console.log(`ℹ️ No action needed (current: ${order.status}, webhook: ${newStatus})`);
                    
                    webhookHistory.unshift({
                        timestamp,
                        ip: clientIp,
                        order_id: orderId,
                        current_status: order.status,
                        webhook_status: newStatus,
                        action: 'ignored'
                    });
                }
            } else {
                console.log(`⚠️ Order not found in store: ${orderId}`);
                
                webhookHistory.unshift({
                    timestamp,
                    ip: clientIp,
                    order_id: orderId,
                    status: rawStatus,
                    error: 'Order not found'
                });
            }
        } else {
            console.log('⚠️ No order ID in webhook payload');
            
            webhookHistory.unshift({
                timestamp,
                ip: clientIp,
                error: 'No order ID',
                body: body
            });
        }

        // Trim history
        while (webhookHistory.length > MAX_HISTORY) {
            webhookHistory.pop();
        }

    } catch (error) {
        console.error('\n❌ Webhook processing error:');
        console.error(error);
        
        webhookHistory.unshift({
            timestamp,
            ip: clientIp,
            error: error.message,
            stack: error.stack
        });
        
        if (webhookHistory.length > MAX_HISTORY) {
            webhookHistory.pop();
        }
    }

    // ALWAYS RETURN 200 untuk webhook
    // Mencegah pengirim melakukan retry berulang
    console.log('\n✅ Webhook response sent (200 OK)');
    console.log('='.repeat(60) + '\n');
    
    return res.status(200).json({ 
        received: true,
        timestamp: new Date().toISOString()
    });
};

// =============================================
// ENDPOINT UNTUK MELIHAT HISTORY WEBHOOK (DEBUG)
// =============================================
module.exports.getHistory = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
        ok: true,
        total: webhookHistory.length,
        history: webhookHistory
    });
};

// =============================================
// ENDPOINT UNTUK MELIHAT ORDER STORE (DEBUG)
// =============================================
module.exports.getOrders = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const orders = [];
    for (const [key, value] of orderStore.entries()) {
        orders.push({
            order_id: key,
            ...value
        });
    }
    
    return res.status(200).json({
        ok: true,
        total: orders.length,
        orders: orders
    });
};

// =============================================
// ENDPOINT UNTUK TEST WEBHOOK (DEBUG)
// =============================================
module.exports.test = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        return res.status(200).json({
            ok: true,
            message: 'Webhook test endpoint working',
            received: req.body
        });
    }
    
    return res.status(200).json({
        ok: true,
        message: 'Webhook test endpoint - Send POST request with payment data',
        example: {
            order_id: 'ORD-1234567890-ABCD',
            status: 'paid',
            amount: 15000,
            project: 'cupzyyy'
        }
    });
};
