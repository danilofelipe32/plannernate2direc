import React, { useState } from 'react';
import { Loader2, Edit2, Wand2 } from 'lucide-react';
import { generateAIContent } from '../lib/ai';

interface TextInputActionsProps {
  onEdit: () => void;
  isTextArea?: boolean;
  onGenerate?: (text: string) => void;
  prompt?: string;
}

export const TextInputActions: React.FC<TextInputActionsProps> = ({ onEdit, isTextArea, onGenerate, prompt }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!onGenerate || !prompt) return;
    setIsLoading(true);
    try {
      const systemInstruction = "Você é um especialista sênior em gestão educacional e inovação pedagógica. Sua linguagem é clara, objetiva, técnica e profissional. Você deve fornecer respostas diretas, sem introduções ou conclusões desnecessárias, focando puramente no conteúdo solicitado.";
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
    <div className={`absolute right-2 ${isTextArea ? 'top-2' : 'top-1/2 -translate-y-1/2'} flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700`}>
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-all duration-200"
        title="Editar texto"
      >
        <Edit2 size={14} />
      </button>
      {onGenerate && prompt && (
        <>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-md transition-all duration-200"
            title="Gerar com IA"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          </button>
        </>
      )}
    </div>
  );
};
