import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import gameRoutes from './routes/game.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { gameManager } from './services/gameManager.service.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : '*';

const io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB payload cap to prevent RAM overflow
});

// Global crash protection guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CrashGuard] Trapped Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[CrashGuard] Trapped Uncaught Exception:', err);
});

// Register Socket.io with GameManagerService
gameManager.setSocketServer(io);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', globalRateLimiter);


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

// Static files for client (Production on Render.com)
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.resolve(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Socket.io
io.on('connection', (socket) => {
  socket.on('join-game', (gameType: string) => {
    socket.join(`game:${gameType}`);
    const activeRound = gameManager.getActiveRound(gameType);
    if (activeRound) {
      socket.emit('active-round-state', activeRound);
    }
  });

  socket.on('disconnect', () => {
    // Graceful disconnect cleanup
  });
});

// Error handler (must be last)
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready & GameManager active`);

  // Render Self-Ping Keep-Alive service (prevents Render free tier from sleeping)
  const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
  setInterval(async () => {
    try {
      const pingUrl = process.env.RENDER_EXTERNAL_URL
        ? (process.env.RENDER_EXTERNAL_URL.startsWith('http')
            ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
            : `https://${process.env.RENDER_EXTERNAL_URL}/api/health`)
        : `http://localhost:${PORT}/api/health`;

      const response = await fetch(pingUrl);
      if (response.ok) {
        console.log(`[KeepAlive] Self-ping pulse active: ${pingUrl} (${new Date().toLocaleTimeString()})`);
      }
    } catch {
      // Keep silent on minor local network ticks
    }
  }, KEEP_ALIVE_INTERVAL_MS);
});

export { io };



