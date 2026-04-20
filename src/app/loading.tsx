export default function Loading() {
  return (
    <div className="min-h-screen bg-[#1a1625] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo animado */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center animate-pulse">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-pink-500" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Puntos de carga */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-pink-500"
              style={{
                animation: 'bounce 1s infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

