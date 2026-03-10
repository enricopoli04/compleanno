import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/event.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✓ MongoDB connesso');

    app.listen(PORT, () => {
      console.log(`✓ Server avviato su http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Errore avvio:', err);
    process.exit(1);
  }
}

start();
