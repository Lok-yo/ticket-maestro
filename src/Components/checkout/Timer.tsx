'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialMinutes?: number;
  onExpire?: () => void;
  eventKey?: string;
}

export function Timer({ initialMinutes = 10, onExpire, eventKey = 'default' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storageKey = `ticket-timer-${eventKey}`;
    const storedExpire = sessionStorage.getItem(storageKey);
    const now = Date.now();
    
    let targetTime: number;
    if (storedExpire) {
        targetTime = parseInt(storedExpire, 10);
        const remaining = Math.floor((targetTime - now) / 1000);
        if (remaining <= 0) {
            setTimeLeft(0);
        } else {
            setTimeLeft(remaining);
        }
    } else {
        targetTime = now + (initialMinutes * 60 * 1000);
        sessionStorage.setItem(storageKey, targetTime.toString());
        setTimeLeft(initialMinutes * 60);
    }

    const intervalId = setInterval(() => {
      const currentRemaining = Math.floor((targetTime - Date.now()) / 1000);
      if (currentRemaining <= 0) {
        clearInterval(intervalId);
        setTimeLeft(0);
        sessionStorage.removeItem(storageKey);
        if (onExpire) onExpire();
      } else {
        setTimeLeft(currentRemaining);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [initialMinutes, onExpire, eventKey]);

  if (!isMounted) return null; // Evitar hidratación mismatch

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Render format MM:SS
  const pad = (num: number) => num.toString().padStart(2, '0');

  const isWarning = timeLeft < 120; // less than 2 minutes

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
      isWarning ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white'
    }`}>
      <Clock className="w-5 h-5" />
      <span>{pad(minutes)}:{pad(seconds)}</span>
    </div>
  );
}
