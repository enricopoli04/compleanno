import "dotenv/config";
import dns from "dns";
import crypto from "crypto";

// import express from 'express';
import express, { Request, Response, NextFunction } from "express";

import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/event.js";
import adminRoutes from "./routes/admin.js";

const secret = process.env.JWT_SECRET ?? '';
if (secret.length < 32) {
  console.error('JWT_SECRET troppo corto o mancante (minimo 32 caratteri). Generarne uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
if (/^(cambia|change|secret|example|placeholder)/i.test(secret)) {
  console.warn('JWT_SECRET sembra un placeholder. Sostituiscilo con un segreto casuale.');
}
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const app = express();
const PORT = process.env.PORT || 3001;
app.use(helmet());

// app.use(cors({
//   origin: process.env.FRONTEND_URL || '*',
// }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(hpp());

// app.use(express.json());
app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
});

mongoose.set("sanitizeFilter", true);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err.name === "CastError") {
    res.status(400).json({ error: "ID non valido" });
    return;
  }

  // if (err.code === 11000) {
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Payload troppo grande" });
    return;
  }
  if (err.code === 11000) {

    res.status(409).json({ error: "Risorsa già esistente" });
    return;
  }
  res.status(500).json({ error: "Errore del server" });
});
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✓ MongoDB connesso");
    app.listen(PORT, () => {
      console.log(`✓ Server avviato su http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("✗ Errore avvio:", err);
    process.exit(1);
  }
}
start();
