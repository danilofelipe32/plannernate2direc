import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const bodyStr = req.body ? JSON.stringify(req.body) : "";
    const apiKey = process.env.APIFREELLM_API_KEY;
    
    if (!apiKey) {
      console.error("APIFREELLM_API_KEY is not defined in environment variables!");
      return res.status(500).json({ success: false, error: "API Key not configured" });
    }

    const payload = req.body && Object.keys(req.body).length > 0 ? req.body : { message: "Ping", model: "apifreellm" };

    const response = await fetch("https://apifreellm.com/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://apifreellm.com",
        "Referer": "https://apifreellm.com/"
      },
      body: JSON.stringify(payload)
    });

    console.log(`[API Proxy] Status: ${response.status} | Modelo: ${payload.model || 'default'}`);
    const textData = await response.text();
    
    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      console.error("Failed to parse API response as JSON. Raw response:", textData.substring(0, 500));
      return res.status(response.status).json({ success: false, error: "Invalid JSON from upstream API", raw: textData.substring(0, 200) });
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error proxying to APIFreeLLM:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
