module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false });
    }

    // Log webhook dari Pakasir
    console.log("[WEBHOOK]", JSON.stringify(req.body));

    // Always return 200
    return res.json({ received: true });
};
