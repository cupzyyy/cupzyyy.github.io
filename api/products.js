// api/products.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const products = [
        {
            id: 'body-hs-100',
            name: 'BODY HS 100%',
            description: 'Work di semua device',
            price: 15000,
            icon: '💪'
        },
        {
            id: 'headlock-97',
            name: 'HEADLOCK 97%',
            description: 'Work di semua device',
            price: 10000,
            icon: '🔒'
        }
    ];

    return res.json({ ok: true, products });
};