// src/routes/auth.js
const router  = require("express").Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { z }   = require("zod");
const prisma  = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// ── Helpers ───────────────────────────────────────────────────────────────────
function signAccess(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });
}
function signRefresh(userId) {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES_IN || "30d" });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const schema = z.object({
      email:    z.string().email("Nevažeći email"),
      password: z.string().min(8, "Lozinka mora imati min. 8 znakova"),
      displayName: z.string().min(2).max(30).optional(),
    });
    const { email, password, displayName } = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email već postoji" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName: displayName || email.split("@")[0] },
    });

    const accessToken  = signAccess(user.id);
    const refreshToken = signRefresh(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.displayName,
              kycStatus: user.kycStatus, balanceEur: user.balanceEur },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email:    z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Pogrešan email ili lozinka" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Pogrešan email ili lozinka" });

    const accessToken  = signAccess(user.id);
    const refreshToken = signRefresh(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id, email: user.email, displayName: user.displayName,
        kycStatus: user.kycStatus, isAdmin: user.isAdmin,
        balanceEur: user.balanceEur, balanceUsdc: user.balanceUsdc,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token nedostaje" });

    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: "Nevažeći refresh token" });
    }

    const newAccess  = signAccess(user.id);
    const newRefresh = signRefresh(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(401).json({ error: "Nevažeći token" });
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, email: true, displayName: true, avatarUrl: true,
                kycStatus: true, isAdmin: true, balanceEur: true, balanceUsdc: true,
                createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
