// ============================================================
//  EXPRESS SERVER - MAIN ENTRY POINT
//  Server: http://localhost:3000
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import API Handlers
const createOrderHandler = require("./api/create-order");
const checkStatusHandler = require("./api/check-status");
const webhookHandler = require("./api/webhook");

// ==================== CONFIG ====================
const PORT = process.env.PORT || 3000;

// ==================== INIT APP ====================
const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public (Frontend)
app.use(express.static(path.join(__dirname, "../public")));

// ==================== API ROUTES ====================

// Create Order + QRIS
app.post("/api/create-order", createOrderHandler);

// Check Payment Status
app.post("/api/check-status", checkStatusHandler);

// Webhook Receiver
app.post("/api/webhook", webhookHandler);

// Webhook History (Debug)
app.get("/api/webhook/history", webhookHandler.getHistory);

// Get Products List
app.get("/api/products", (req, res) => {
    const { PRODUCTS } = require("./api/create-order");
    res.json({
        ok: true,
        products: PRODUCTS
    });
});

// ==================== FRONTEND ROUTE ====================
// Serve index.html for root path
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.message);
    res.status(500).json({
        ok: false,
        error: "Internal server error"
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log("");
    console.log("╔═══════════════════════════════════════════╗");
    console.log("║   🚀 AUTO ORDER PAKASIR SERVER RUNNING    ║");
    console.log("╠═══════════════════════════════════════════╣");
    console.log(`║   URL: http://localhost:${PORT}              ║`);
    console.log("╠═══════════════════════════════════════════╣");
    console.log("║   API Endpoints:                          ║");
    console.log("║   • POST /api/create-order                ║");
    console.log("║   • POST /api/check-status                ║");
    console.log("║   • POST /api/webhook                     ║");
    console.log("║   • GET  /api/products                    ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log("");
});
