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

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
await connectDB();

// Auto-seed if database is completely empty
try {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('🔄 Fresh database detected. Running automatic initial seed...');
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
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
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
