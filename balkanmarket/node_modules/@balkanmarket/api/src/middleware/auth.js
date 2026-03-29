// src/middleware/auth.js
const jwt    = require("jsonwebtoken");
const prisma = require("../lib/prisma");

/**
 * Obavezna autentifikacija
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Nisi prijavljen" });
    }

    const token   = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: { id: true, email: true, kycStatus: true, isAdmin: true,
                balanceEur: true, balanceUsdc: true, displayName: true },
    });

    if (!user) return res.status(401).json({ error: "Korisnik ne postoji" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token istekao", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Nevažeći token" });
  }
}

/**
 * Opciona autentifikacija (ne baca grešku ako nema tokena)
 */
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();
    const token   = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: { id: true, email: true, kycStatus: true, isAdmin: true },
    });
  } catch (_) {}
  next();
}

/**
 * Admin zaštita
 */
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Zabranjen pristup" });
  }
  next();
}

/**
 * KYC level zaštita
 */
function requireKyc(level) {
  const levels = { PENDING: 0, BASIC: 1, VERIFIED: 2, PREMIUM: 3 };
  return (req, res, next) => {
    if (levels[req.user?.kycStatus] < levels[level]) {
      return res.status(403).json({
        error: `Potrebna KYC verifikacija: ${level}`,
        code:  "KYC_REQUIRED",
        requiredLevel: level,
      });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireKyc };
