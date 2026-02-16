const PROJECT_SLUG = process.env.PROJECT_SLUG || "cupzyyy";
const API_KEY = process.env.API_KEY || "";

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
        const { order_id, amount } = req.body;

        if (!order_id || !amount) {
            return res.json({ ok: true, status: "pending" });
        }

        // Call Pakasir API
        const url = new URL("https://app.pakasir.com/api/transactiondetail");
        url.searchParams.set("project", PROJECT_SLUG);
        url.searchParams.set("amount", String(amount));
        url.searchParams.set("order_id", order_id);
        url.searchParams.set("api_key", API_KEY);

        const apiRes = await fetch(url.toString());
        const json = await apiRes.json();
        const tx = json.transaction || json;
        const status = (tx.status || "pending").toLowerCase();

        return res.json({ ok: true, status });

    } catch (e) {
        // Jangan error, return pending biar frontend tetap polling
        return res.json({ ok: true, status: "pending" });
    }
};
