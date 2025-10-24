import { motion } from 'framer-motion';
import { useState, useEffect } from 'react'; // ✅ IMPORTE AQUI

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
  cursorBlinkSpeed?: number;
}

export const TypewriterText = ({ 
  text, 
  delay = 0, 
  speed = 50, 
  className = "",
  onComplete,
  cursor = true,
  cursorBlinkSpeed = 500
}: TypewriterTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const delayTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          const newText = text.slice(0, currentIndex + 1);
          setDisplayText(newText);
          setCurrentIndex(prev => prev + 1);
          
          // Verifica se terminou
          if (currentIndex + 1 === text.length) {
            setIsComplete(true);
            if (onComplete) onComplete();
          }
        }, speed);
        
        return () => clearTimeout(timeout);
      }
    }, delay * 1000);

    return () => clearTimeout(delayTimeout);
  }, [currentIndex, text, speed, delay, onComplete]);

  // Controla o piscar do cursor após digitação completa
  useEffect(() => {
    if (isComplete && cursor) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, cursorBlinkSpeed);
      
      return () => clearInterval(interval);
    }
  }, [isComplete, cursor, cursorBlinkSpeed]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`inline-block font-japanese ${className}`}
    >
      {displayText}
      {cursor && showCursor && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: isComplete ? Infinity : 0 }}
          className="ml-1"
        >
          |
        </motion.span>
      )}
    </motion.span>
  );
};

export default TypewriterText;