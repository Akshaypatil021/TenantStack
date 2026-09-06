import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'TenantFlow API is running.' });
});

import path from 'path';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import fileRoutes from './modules/files/file.routes';
import userRoutes from './modules/users/user.routes';

// Serve uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/users', userRoutes);

// Global Error Handler placeholder
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
