const crypto = require("crypto");

const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "x5ex44h3cexOAvi37EOEKMlFvRPsGa3f";

function extractQris(str) {
    if (!str) return null;
    if (str.startsWith("00020101")) return str;
    const idx = str.indexOf("00020101");
    if (idx !== -1) return str.substring(idx);
    return null;
}

module.exports = async (req, res) => {
    // Hanya terima POST
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
        const amount = parseInt(req.body.amount);

        // Validasi
        if (!amount || isNaN(amount) || amount < 1000) {
            return res.json({ ok: false, error: "Minimal Rp 1.000" });
        }
        if (amount > 10000000) {
            return res.json({ ok: false, error: "Maksimal Rp 10.000.000" });
        }

        // Generate Order ID
        const orderId = `DP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        // Call Pakasir API
        const apiRes = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project: PROJECT_SLUG,
                order_id: orderId,
                amount,
                api_key: API_KEY
            })
        });

        const json = await apiRes.json();
        const payment = json.payment;

        // Validasi response
        if (!payment || !payment.payment_number) {
            console.log("API ERROR:", JSON.stringify(json));
            return res.json({ ok: false, error: "Gagal membuat QRIS" });
        }

        // Extract QRIS (handle sandbox prefix)
        const qris = extractQris(payment.payment_number);
        if (!qris) {
            return res.json({ ok: false, error: "QRIS tidak valid" });
        }

        // Success
        return res.json({
            ok: true,
            order_id: orderId,
            amount,
            total_payment: payment.total_payment || amount,
            fee: payment.fee || 0,
            qris,
            expired_at: payment.expired_at || null
        });

    } catch (e) {
        console.error("CREATE ERROR:", e.message);
        return res.json({ ok: false, error: "Server error" });
    }
};
