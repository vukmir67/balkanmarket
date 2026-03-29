// src/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

exports.rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Previše zahtjeva. Pokušaj opet za minutu." },
});

exports.authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 20,
  message: { error: "Previše pokušaja prijave. Pokušaj opet za 15 minuta." },
});
