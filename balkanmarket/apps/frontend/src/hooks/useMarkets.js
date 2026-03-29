// src/hooks/useMarkets.js
import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";

export function useMarkets(filters = {}) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [pagination, setPagination] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "OPEN", ...filters }).toString();
      const { data } = await api.get(`/markets?${params}`);
      setMarkets(data.markets);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Greška");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { markets, loading, error, pagination, refetch: fetch };
}

export function useMarket(id) {
  const [market,  setMarket]  = useState(null);
  const [history, setHistory] = useState([]);
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [mRes, hRes, tRes] = await Promise.all([
        api.get(`/markets/${id}`),
        api.get(`/markets/${id}/history`),
        api.get(`/markets/${id}/trades`),
      ]);
      setMarket(mRes.data);
      setHistory(hRes.data);
      setTrades(tRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Tržište nije pronađeno");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  // Live price update via socket
  const updatePrice = useCallback((yesPrice, noPrice) => {
    setMarket((m) => m ? { ...m, yesPrice, noPrice } : m);
    setHistory((h) => [
      ...h,
      { yesPrice, noPrice, timestamp: new Date().toISOString(), volume: market?.volume || 0 },
    ]);
  }, [market]);

  return { market, history, trades, loading, error, refetch: fetch, updatePrice };
}
