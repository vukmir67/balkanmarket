// src/middleware/errorHandler.js
exports.errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Greška validacije",
      details: err.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    });
  }

  if (err.code === "P2002") { // Prisma unique constraint
    return res.status(409).json({ error: "Zapis već postoji" });
  }

  if (err.code === "P2025") { // Prisma record not found
    return res.status(404).json({ error: "Nije pronađeno" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Interna greška servera",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
