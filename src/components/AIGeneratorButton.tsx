import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { generateAIContent } from '../lib/ai';

interface AIGeneratorButtonProps {
  onGenerate: (text: string) => void;
  prompt: string;
}

// Custom Magic Wand Icon (Yellow and Black)
const MagicWandIcon = ({ size = 18 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M15 4V2m0 2h2m-2 0h-2m2 2v2m0-2h2m-2 0h-2" stroke="#000" />
    <path d="M15 4l-9 9m9-9l9 9m-9 9l-9-9m9 9l9-9" stroke="#FFD700" />
    <path d="M3 21l3-3m0 0l-3-3m3 3l3 3m-3-3l3-3" stroke="#000" />
  </svg>
);

export const AIGeneratorButton: React.FC<AIGeneratorButtonProps> = ({ onGenerate, prompt }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const systemInstruction = "Você é um assistente inteligente especializado em produtividade e organização. Sua linguagem é clara, objetiva e profissional.";
      const text = await generateAIContent(prompt, systemInstruction);
      
      if (text) {
        onGenerate(text.trim());
      }
    } catch (error) {
      console.error('Error generating text:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar texto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isLoading}
      className="absolute right-2 top-2 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all duration-200 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
      title="Gerar com IA"
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <MagicWandIcon size={18} />}
    </button>
  );
};
