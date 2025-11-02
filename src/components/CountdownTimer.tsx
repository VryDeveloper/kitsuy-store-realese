import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });

  const calculateTimeLeft = (): TimeLeft => {
    // ⏰ DEFINA AQUI A DATA FINAL DA OFERTA
    const offerEndDate = new Date('2025-11-30T23:59:59').getTime();
    const now = new Date().getTime();
    const difference = offerEndDate - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    } else {
      // Oferta expirada
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
  };

  useEffect(() => {
    // Calcula imediatamente ao carregar
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: number): string => time.toString().padStart(2, '0');

  // Se a oferta expirou
  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <div className="bg-gray-600 text-white px-6 py-3 rounded-2xl shadow-lg text-center">
        <div className="text-xl font-bold">⏰ OFERTA EXPIRADA</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center gap-4 mb-8">
      <div className="bg-primary text-white px-6 py-3 rounded-2xl shadow-lg">
        <div className="text-sm font-semibold mb-1">OFERTA TERMINA EM:</div>
        <div className="flex gap-3 text-2xl font-bold">
          <div className="flex flex-col items-center">
            <span className="bg-black px-3 py-1 rounded-lg">{formatTime(timeLeft.days)}</span>
            <span className="text-xs mt-1">DIAS</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="bg-black px-3 py-1 rounded-lg">{formatTime(timeLeft.hours)}</span>
            <span className="text-xs mt-1">HORAS</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="bg-black px-3 py-1 rounded-lg">{formatTime(timeLeft.minutes)}</span>
            <span className="text-xs mt-1">MIN</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="bg-black px-3 py-1 rounded-lg">{formatTime(timeLeft.seconds)}</span>
            <span className="text-xs mt-1">SEG</span>
          </div>
        </div>
      </div>
    </div>
  );
};