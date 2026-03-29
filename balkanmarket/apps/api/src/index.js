// apps/api/src/index.js — BalkanMarket API Server

require("dotenv").config();
const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const helmet     = require("helmet");
const { Server } = require("socket.io");

const { rateLimiter, authRateLimiter } = require("./middleware/rateLimiter");
const authRoutes    = require("./routes/auth");
const marketRoutes  = require("./routes/markets");
const tradeRoutes   = require("./routes/trades");
const paymentRoutes = require("./routes/payments");
const adminRoutes   = require("./routes/admin");
const { setupSocketIO } = require("./services/socket");
const { errorHandler } = require("./middleware/errorHandler");

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, methods: ["GET", "POST"] },
});
setupSocketIO(io);
app.set("io", io);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Stripe webhooks trebaju raw body — MORA biti PRIJE express.json()
app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(rateLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRateLimiter, authRoutes);
app.use("/api/markets",  marketRoutes);
app.use("/api/trades",   tradeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin",    adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 BalkanMarket API running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };
