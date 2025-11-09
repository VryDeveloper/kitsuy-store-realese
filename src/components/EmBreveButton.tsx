import React, { useState } from 'react';

interface EmBreveButton {
  texto: string;
  onClickOriginal?: () => void;
}

export const EmBreveButton: React.FC<EmBreveButton> = ({ 
  texto, 
  onClickOriginal 
}) => {
  const [showEmBreve, setShowEmBreve] = useState(false);

  const handleClick = () => {
    setShowEmBreve(true);
    setTimeout(() => setShowEmBreve(false), 2000);
    
    // Executa a função original se existir
    if (onClickOriginal) {
      onClickOriginal();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
      >
        {texto}
      </button>
      
      {showEmBreve && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10">
          <div className="bg-pink-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
            Em breve!
          </div>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45"></div>
        </div>
      )}
    </div>
  );
};