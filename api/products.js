// GET /api/products
const { PRODUCTS } = require('./create-order.js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    return res.json({ ok: true, products: PRODUCTS });
};
