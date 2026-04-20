'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // Simula completar la barra cuando llegó la nueva página
    setProgress(100);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);

    return () => clearTimeout(hideTimer);
  }, [pathname]);

  // Cuando el usuario hace click en un link, arrancamos la barra
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
      if (href === pathname) return;

      setProgress(0);
      setVisible(true);

      // Avanza rápidamente a 80% y se detiene esperando la nueva ruta
      let p = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        p = p < 30 ? p + 15 : p < 60 ? p + 8 : p < 80 ? p + 3 : p;
        setProgress(p);
        if (p >= 80) clearInterval(timerRef.current!);
      }, 60);
    };

    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ec4899, #a855f7, #ec4899)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s infinite linear',
          boxShadow: '0 0 10px rgba(236,72,153,0.7), 0 0 30px rgba(168,85,247,0.4)',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}

