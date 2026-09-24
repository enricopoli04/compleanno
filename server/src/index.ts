import 'dotenv/config';
import dns from 'dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/event.js';
import adminRoutes from './routes/admin.js';

// Node's default resolver can fail to look up the SRV records used by
// mongodb+srv:// URIs on some Windows setups even when the OS resolves
// them fine, so we point it at public resolvers explicitly.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/admin', adminRoutes);

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
