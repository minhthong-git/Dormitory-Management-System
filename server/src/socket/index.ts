import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '@/config/env';
import { verifyAccessToken } from '@/utils/jwt';
import type { JwtPayload } from '@/types';

// ── Extend Socket with user payload ───────────────────────────
interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

let io: SocketIOServer | null = null;

// ── Initialize Socket.io ───────────────────────────────────────
export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Authentication middleware ────────────────────────────────
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Xác thực thất bại: thiếu token'));
    }
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Xác thực thất bại: token không hợp lệ'));
    }
  });

  // ── Connection handler ───────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.sub;
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // Tham gia room theo user ID để push notification riêng
    if (userId) {
      void socket.join(`user:${userId}`);
    }

    // ── Event: ping/pong ─────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ── Event: join a channel ─────────────────────────────────
    socket.on('join:room', (roomId: string) => {
      void socket.join(`room:${roomId}`);
      socket.emit('joined:room', { roomId });
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${userId} — reason: ${reason}`);
    });
  });

  console.log('[Socket.io] Initialized');
  return io;
};

// ── Export io instance (dùng trong controllers để emit) ────────
export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io chưa được khởi tạo');
  return io;
};
