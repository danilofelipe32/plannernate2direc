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
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      body: JSON.stringify(payload)
    });

    const textData = await response.text();
    
    // Se não for sucesso, vamos retornar o erro detalhado para depuração
    if (!response.ok) {
      console.error(`[Proxy Error] Status: ${response.status}`, textData.substring(0, 200));
      return res.status(response.status).json({ 
        success: false, 
        error: `A API retornou erro ${response.status}. Verifique sua chave ou tente novamente.`,
        details: textData.substring(0, 100)
      });
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      return res.status(500).json({ success: false, error: "Resposta da IA inválida (Não é JSON)", raw: textData.substring(0, 100) });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error proxying to APIFreeLLM:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
