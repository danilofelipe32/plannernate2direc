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
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const textData = await response.text();
    console.log(`[Proxy] Status: ${response.status} | Bytes: ${textData.length}`);
    
    if (!response.ok) {
      console.error(`[Proxy Error] Status ${response.status}: ${textData.substring(0, 200)}`);
      return res.status(response.status).json({ 
        success: false, 
        error: `Erro no servidor de IA (Status ${response.status})`,
        details: textData.includes("cloudflare") || textData.includes("Forbidden") ? "Acesso bloqueado pelo firewall da API. Tente novamente em instantes." : textData.substring(0, 100)
      });
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      return res.status(500).json({ success: false, error: "Resposta da IA não é um JSON válido", raw: textData.substring(0, 100) });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error proxying to APIFreeLLM:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
