import { useEffect, useRef } from 'react';
import { useStore } from '@/store';

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

function connect() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${proto}//${window.location.host}/ws`;
  try {
    socket = new WebSocket(url);
  } catch (e) {
    scheduleReconnect();
    return;
  }
  socket.onopen = () => {
    useStore.getState().setWsConnected(true);
  };
  socket.onclose = () => {
    useStore.getState().setWsConnected(false);
    scheduleReconnect();
  };
  socket.onerror = () => {
    try {
      socket?.close();
    } catch {
      // ignore
    }
  };
  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const store = useStore.getState();
      switch (msg.type) {
        case 'task:created':
          store.upsertTask(msg.payload);
          break;
        case 'task:update':
          store.upsertTask({ id: msg.payload.id, ...msg.payload });
          break;
        case 'task:progress':
          store.updateTaskProgress(msg.payload.id, msg.payload);
          break;
        case 'task:removed':
          store.removeTask(msg.payload.id);
          break;
        default:
          break;
      }
    } catch {
      // ignore
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 1500);
}

export function useWebSocket() {
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connect();
    }
  }, []);
}