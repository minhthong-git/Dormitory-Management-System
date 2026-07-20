import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { prisma } from './config/db';
import apiRoutes from './routes';
import { initSocket } from './socket';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { cronService } from './services/cron.service';

// ── App Setup ──────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// Patch BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// ── Security & Logging ─────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ── Body parsers ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files (uploaded assets) ────────────────────────────
app.use(`/${env.UPLOAD_DIR}`, express.static(path.join(__dirname, '..', env.UPLOAD_DIR)));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 & Error handlers ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Socket.io ─────────────────────────────────────────────────
initSocket(httpServer);

// ── Start Server ───────────────────────────────────────────────
const startServer = async () => {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('[DB] Prisma connected successfully');

    // Start background cron jobs
    cronService.init();

    httpServer.listen(env.PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌍 Environment: ${env.NODE_ENV}\n`);
    });
  } catch (error) {
    console.error('[DB] Failed to connect:', error);
    process.exit(1);
  }
};

// ── Graceful shutdown ──────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
