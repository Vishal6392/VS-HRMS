import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from './utils/seed.js';
import User from './models/User.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enforce Indian Standard Time (IST) for operational shift calculations
process.env.TZ = process.env.TIMEZONE || 'Asia/Kolkata';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { startPhotoCleanupJob } from './services/photoCleanupService.js';
import { syncSuperAdminFromEnv } from './utils/syncSuperAdmin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
await connectDB();

// Ensure SuperAdmin credentials from Environment Variables (Render) are synced and detached from Employee records
await syncSuperAdminFromEnv();

// Start automated 40-day photo retention cleanup routine
startPhotoCleanupJob();

// Auto-seed if database is completely empty
try {
  const userCount = await User.countDocuments();
  if (userCount <= 1) {
    // Only SuperAdmin or empty DB, run seed for base shifts
    await seedDatabase();
  }
} catch (seedErr) {
  console.error('Warning during auto-seed check:', seedErr.message);
}

// Global Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
// Support base64 camera photo uploads (15MB limit)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VS HRMS Attendance Engine',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);

// In production, serve Vite client build from client/dist (for Render deployment)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const assetsDistPath = path.resolve(clientDistPath, 'assets');

// Explicit static handlers for /assets and any nested relative asset requests
app.use('/assets', express.static(assetsDistPath));
app.use('*/assets', express.static(assetsDistPath));
app.use(express.static(clientDistPath));

// SPA Catch-all: Route all other requests to index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  // If the request looks like a static asset (.js, .css, .ico, .png, etc.) and reached here, return 404 instead of index.html
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff2?|map)$/i.test(req.path)) {
    return res.status(404).end();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If client not yet built, return simple JSON
      res.json({
        message: 'VS HRMS API Server is operational. Run Vite dev server for frontend UI.',
      });
    }
  });
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 HRMS Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
