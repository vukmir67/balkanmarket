// src/services/socket.js — Real-time WebSocket service

function setupSocketIO(io) {
  io.on("connection", (socket) => {
    console.log(`[WS] Klijent spojen: ${socket.id}`);

    // Korisnik se pretplati na određeno tržište
    socket.on("subscribe:market", (marketId) => {
      socket.join(`market:${marketId}`);
    });

    socket.on("unsubscribe:market", (marketId) => {
      socket.leave(`market:${marketId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Klijent odspojen: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketIO };
