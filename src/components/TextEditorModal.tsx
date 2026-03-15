import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, X, Check, Palette, Wand2, Loader2, Send } from 'lucide-react';
import { generateAIContent } from '../lib/ai';

interface TextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  onSave: (text: string) => void;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({ isOpen, onClose, text, onSave }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState('#000000');
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const isLoading = isGeneratingSimilar || isRefining;
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');

  useEffect(() => {
    if (isOpen && editorRef.current) {
      // Only set innerHTML if it's different to avoid losing cursor position
      if (editorRef.current.innerHTML !== text) {
        editorRef.current.innerHTML = text;
      }
    }
  }, [isOpen, text]);

  if (!isOpen) return null;

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    applyFormat('foreColor', newColor);
  };

  const handleSave = () => {
    if (editorRef.current) {
      onSave(editorRef.current.innerHTML);
    }
  };

  const handleGenerateSimilar = async () => {
    if (!editorRef.current) return;
    const currentText = editorRef.current.innerText;
    if (!currentText.trim()) return;

    setIsGeneratingSimilar(true);
    try {
      const systemInstruction = "Você é um assistente de escrita criativa e profissional. Sua tarefa é expandir textos mantendo a coerência e o estilo original.";
      const prompt = `O texto atual é: "${currentText}". Por favor, gere mais conteúdo semelhante e contextualizado que continue ou complemente este texto. Retorne apenas o texto adicional, mantendo o tom e o estilo.`;
      const additionalText = await generateAIContent(prompt, systemInstruction);

      if (additionalText && editorRef.current) {
        // Append the new text
        const newContent = editorRef.current.innerHTML + ' ' + additionalText.trim();
        editorRef.current.innerHTML = newContent;
      }
    } catch (error) {
      console.error("Erro ao gerar conteúdo semelhante:", error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar texto');
    } finally {
      setIsGeneratingSimilar(false);
    }
  };

  const handleRefineText = async () => {
    if (!editorRef.current || !refinePrompt.trim()) return;
    const currentText = editorRef.current.innerText;

    setIsRefining(true);
    try {
      const systemInstruction = "Você é um editor de texto profissional. Sua tarefa é modificar textos de acordo com instruções específicas, mantendo a qualidade e clareza.";
      const prompt = `Texto original: "${currentText}". Solicitação de mudança: "${refinePrompt}". Por favor, reescreva o texto atendendo à solicitação. Retorne apenas o texto reescrito.`;
      const refinedText = await generateAIContent(prompt, systemInstruction);

      if (refinedText && editorRef.current) {
        editorRef.current.innerHTML = refinedText.trim();
        setShowRefineInput(false);
        setRefinePrompt('');
      }
    } catch (error) {
      console.error("Erro ao refinar texto:", error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar texto');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Editor de Texto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-1 items-center flex-wrap">
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('bold')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Negrito"
            >
              <Bold size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('italic')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Itálico"
            >
              <Italic size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('underline')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Sublinhado"
            >
              <Underline size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('strikeThrough')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Tachado"
            >
              <Strikethrough size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('justifyLeft')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Alinhar à Esquerda"
            >
              <AlignLeft size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('justifyCenter')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Centralizar"
            >
              <AlignCenter size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('justifyRight')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Alinhar à Direita"
            >
              <AlignRight size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <div className="flex items-center gap-1">
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('insertUnorderedList')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Lista com Marcadores"
            >
              <List size={18} />
            </button>
            <button 
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('insertOrderedList')} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
              title="Lista Numerada"
            >
              <ListOrdered size={18} />
            </button>
          </div>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          
          <div className="relative flex items-center">
            <button 
              type="button"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 relative overflow-hidden"
              title="Cor do Texto"
            >
              <Palette size={18} />
              <input 
                type="color" 
                value={color}
                onChange={handleColorChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div
            ref={editorRef}
            contentEditable
            className="w-full h-64 p-4 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white overflow-y-auto outline-none"
            style={{ minHeight: '16rem' }}
          />
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-4">
          {showRefineInput && (
            <div className="py-2 flex gap-2 animate-in slide-in-from-bottom-2 duration-200">
              <input 
                type="text" 
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="Ex: Deixe o texto mais formal..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleRefineText()}
                autoFocus
              />
              <button 
                onClick={handleRefineText}
                disabled={isLoading || !refinePrompt.trim()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isRefining ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleGenerateSimilar}
              disabled={isLoading}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-200 dark:shadow-none"
            >
              {isGeneratingSimilar ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Mais conteúdo semelhante
            </button>

            <button 
              onClick={() => setShowRefineInput(!showRefineInput)}
              disabled={isLoading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-green-200 dark:shadow-none"
            >
              {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Refinar este texto...
            </button>
          </div>
          
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"><Check size={18} /> Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
