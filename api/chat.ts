import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  console.log(`Proxying chat request: ${JSON.stringify(req.body).substring(0, 100)}...`);
  try {
    // JEITO CORRETO na pasta /api
    const apiKey = process.env.APIFREELLM_API_KEY;
    
    if (!apiKey) {
      console.error("APIFREELLM_API_KEY is not defined in environment variables!");
      return res.status(500).json({ success: false, error: "API Key not configured" });
    }

    const response = await fetch("https://apifreellm.com/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    console.log(`API response status: ${response.status}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error proxying to APIFreeLLM:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
