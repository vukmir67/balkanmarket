// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io({ path: "/socket.io", transports: ["websocket"] });
  }
  return socketInstance;
}

export function useMarketSocket(marketId, onPriceUpdate) {
  const cbRef = useRef(onPriceUpdate);
  cbRef.current = onPriceUpdate;

  useEffect(() => {
    if (!marketId) return;
    const socket = getSocket();

    socket.emit("subscribe:market", marketId);
    const handler = (data) => {
      if (data.marketId === marketId) {
        cbRef.current(Number(data.yesPrice), Number(data.noPrice));
      }
    };
    socket.on("priceUpdate", handler);
    socket.on("marketResolved", (data) => {
      if (data.marketId === marketId) window.location.reload();
    });

    return () => {
      socket.off("priceUpdate", handler);
      socket.emit("unsubscribe:market", marketId);
    };
  }, [marketId]);
}
