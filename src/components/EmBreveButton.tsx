import { useState } from 'react';

function BotaoCamisetas() {
  const [showEmBreve, setShowEmBreve] = useState(false);

  const handleClick = () => {
    setShowEmBreve(true);
    setTimeout(() => setShowEmBreve(false), 1500);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
      >
        Camisetas
      </button>
      
      <div className={`
        absolute top-full left-1/2 transform -translate-x-1/2 mt-2
        transition-all duration-300 ease-out
        ${showEmBreve 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-2 pointer-events-none'
        }
      `}>
        <div className="bg-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap animate-bounce">
          Em breve!
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45"></div>
        </div>
      </div>
    </div>
  );
}