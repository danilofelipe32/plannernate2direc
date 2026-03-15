/// <reference types="vite/client" />

// Simple cache to avoid redundant requests
const cache = new Map<string, { response: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Queue for handling rate limits
let activeRequests = 0;
const MAX_CONCURRENT = 1;
const queue: { execute: () => Promise<void>, priority: number }[] = [];

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
  
  // Sort by priority (higher first)
  queue.sort((a, b) => b.priority - a.priority);
  
  const next = queue.shift();
  if (next) {
    activeRequests++;
    try {
      await next.execute();
    } catch (e) {
      console.error("Queue execution error:", e);
    } finally {
      activeRequests--;
      // Small delay between requests to be safe
      setTimeout(processQueue, 500);
    }
  }
}

export async function generateAIContent(prompt: string, systemInstruction?: string, isBackground = false): Promise<string> {
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
          } catch (e) { /* ignored */ }
          
          if (response.status === 429) {
            if (retryCount < 2) {
              const waitTime = 26000 + (retryCount * 5000); // Incremental wait
              console.warn(`Rate limit hit (attempt ${retryCount + 1}), retrying in ${waitTime/1000}s...`);
              
              // Instead of blocking, we schedule a new attempt
              setTimeout(() => {
                queue.push({ 
                  execute: () => executeRequest(retryCount + 1), 
                  priority: isBackground ? 0 : 10 
                });
                processQueue();
              }, waitTime);
              
              return; // Exit this execution, but the promise is still pending
            }
            throw new Error("O limite de requisições da IA gratuita foi atingido. Por favor, aguarde 30 segundos e tente novamente.");
          } else if (response.status === 401) {
            throw new Error(`Chave de API inválida ou expirada.`);
          } else if (response.status === 400) {
            throw new Error(`Requisição inválida. Verifique os dados enviados.`);
          } else if (response.status === 500 && backendError.includes("API Key not configured")) {
            throw new Error("A chave da IA não foi configurada. Verifique as configurações no servidor.");
          }
          throw new Error(`Erro na IA (${response.status}): ${backendError || 'Verifique sua conexão e tente novamente.'}`);
        }

        const data = await response.json();
        
        if (data.success && data.response) {
          cache.set(cacheKey, { response: data.response, timestamp: Date.now() });
          resolve(data.response);
        } else {
          throw new Error("A IA não retornou um conteúdo válido no momento.");
        }
      } catch (error) {
        console.error('AI Request Error:', error);
        reject(error instanceof Error ? error : new Error('Erro desconhecido na IA'));
      }
    };

    queue.push({ 
      execute: () => executeRequest(0), 
      priority: isBackground ? 0 : 10 
    });
    processQueue();
  });
}
