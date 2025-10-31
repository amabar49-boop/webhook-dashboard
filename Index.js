import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { initDB } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = await initDB();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Anti-spam (1 request per 5 detik per IP)
const limiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  message: "Terlalu banyak request! Tunggu sebentar.",
});
app.use("/webhook", limiter);

// Endpoint Webhook
app.post("/webhook", async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const body = JSON.stringify(req.body);

  await db.run("INSERT INTO webhooks (ip, body) VALUES (?, ?)", [ip, body]);

  console.log("Webhook diterima dari:", ip);
  res.status(200).json({ success: true, message: "Webhook diterima!" });
});

// Dashboard tampilan log
app.get("/dashboard", async (req, res) => {
  const rows = await db.all("SELECT * FROM webhooks ORDER BY id DESC LIMIT 50");
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

// API data webhook (dipanggil dari dashboard.html)
app.get("/api/logs", async (req, res) => {
  const rows = await db.all("SELECT * FROM webhooks ORDER BY id DESC LIMIT 50");
  res.json(rows);
});

app.listen(3000, () => console.log("🚀 Server berjalan di http://localhost:3000"));
