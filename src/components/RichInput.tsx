import React, { useEffect, useRef } from 'react';

interface RichInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  isTextArea?: boolean;
  required?: boolean;
}

export const RichInput: React.FC<RichInputProps> = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = '', 
  isTextArea = false,
  required = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="relative w-full">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className={`${className} overflow-y-auto outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 cursor-text`}
        data-placeholder={placeholder}
        style={{ 
          minHeight: isTextArea ? '8rem' : '3rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        role="textbox"
        aria-multiline={isTextArea}
        aria-required={required}
      />
      {required && (
        <input 
          type="text" 
          value={value} 
          onChange={() => {}} 
          required 
          className="absolute opacity-0 w-0 h-0 pointer-events-none" 
          tabIndex={-1}
        />
      )}
    </div>
  );
};
