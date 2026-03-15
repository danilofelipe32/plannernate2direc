/// <reference types="vite/client" />

// Simple cache to avoid redundant requests
const cache = new Map<string, { response: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<string> {
  const fullMessage = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const cacheKey = fullMessage;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.response;
  }

  try {
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.text) {
      cache.set(cacheKey, { response: data.text, timestamp: Date.now() });
      return data.text;
    } else {
      throw new Error(data.error || "A IA não retornou nenhum conteúdo válido.");
    }
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Erro na resposta da IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
