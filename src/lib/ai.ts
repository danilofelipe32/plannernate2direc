/// <reference types="vite/client" />

// Simple cache to avoid redundant requests
const cache = new Map<string, { response: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Queue for handling rate limits
let isProcessing = false;
const queue: (() => Promise<void>)[] = [];

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const next = queue.shift();
  if (next) {
    await next();
    // Add a small delay between successful requests to be safe
    await new Promise(r => setTimeout(r, 1000));
  }
  isProcessing = false;
  if (queue.length > 0) processQueue();
}

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  const fullMessage = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const cacheKey = fullMessage;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.response;
  }

  return new Promise((resolve, reject) => {
    const executeRequest = async (retryCount = 0) => {
      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: fullMessage,
            model: "apifreellm"
          })
        });

        if (!response.ok) {
          let backendError = response.statusText;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              backendError = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
            }
          } catch (e) {
            // failed to parse json
          }
          
          if (response.status === 429) {
            if (retryCount < 2) {
              console.warn(`Rate limit hit (attempt ${retryCount + 1}), retrying in 26 seconds...`);
              await new Promise(r => setTimeout(r, 26000));
              return executeRequest(retryCount + 1);
            }
            throw new Error("Rate limit excedido. Aguarde 25 segundos e tente novamente.");
          } else if (response.status === 401) {
            throw new Error(`Chave de API inválida. Detalhe: ${backendError}`);
          } else if (response.status === 400) {
            throw new Error(`Requisição inválida (parâmetros ausentes). Detalhe: ${backendError}`);
          } else if (response.status === 500 && backendError.includes("API Key not configured")) {
            throw new Error("A chave da IA não foi configurada no Vercel. Adicione a variável APIFREELLM_API_KEY no painel.");
          }
          throw new Error(`Erro na API (${response.status}): ${backendError}`);
        }

        const data = await response.json();
        
        if (data.success && data.response) {
          // Update cache
          cache.set(cacheKey, { response: data.response, timestamp: Date.now() });
          resolve(data.response);
        } else {
          throw new Error("A IA não retornou nenhum conteúdo válido.");
        }
      } catch (error) {
        console.error('Error calling APIFreeLLM:', error);
        reject(new Error(`Erro na resposta da IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
      }
    };

    queue.push(() => executeRequest(0));
    processQueue();
  });
}
