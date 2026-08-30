import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { downloadManager } from './downloadManager';

let wss: WebSocketServer | null = null;

export function attachWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'connected', payload: { ts: Date.now() } }));
    ws.on('error', () => {
      // ignore
    });
  });

  // Bridge downloadManager events to all clients
  downloadManager.subscribe((event) => {
    if (!wss) return;
    const data = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch {
          // ignore
        }
      }
    }
  });

  return wss;
}

export function broadcast(event: { type: string; payload: any }) {
  if (!wss) return;
  const data = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch {
        // ignore
      }
    }
  }
}