import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  // Debug middleware to log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  app.post("/api/v1/chat", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const apiKey = process.env.APIFREELLM_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ success: false, error: "APIFREELLM_API_KEY is not configured" });
      }

      const messages = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch("https://apifreellm.com/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Or whatever model APIFreeLLM uses
          messages: messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`APIFreeLLM API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      res.json({ success: true, text: data.choices[0].message.content });
    } catch (error) {
      console.error("Error in /api/v1/chat:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Catch-all for undefined API routes
  app.all("/api/*", (req, res) => {
    console.log(`404 on API route: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not running as a Vercel function
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
