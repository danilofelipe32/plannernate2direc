/// <reference types="vite/client" />

import { GoogleGenAI } from "@google/genai";

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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    if (response.text) {
      cache.set(cacheKey, { response: response.text, timestamp: Date.now() });
      return response.text;
    } else {
      throw new Error("A IA não retornou nenhum conteúdo válido.");
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(`Erro na resposta da IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
