import "dotenv/config";
import dns from "dns";

// import express from 'express';
import express, { Request, Response, NextFunction } from "express";

import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/event.js";
import adminRoutes from "./routes/admin.js";
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

// app.use(express.json());
app.use(express.json({ limit: "10kb" }));

mongoose.set("sanitizeFilter", true);
app.use("/api/auth", authRoutes);
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
