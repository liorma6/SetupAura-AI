import { Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header = ({ onHomeClick, onMenuToggle }) => {
  const { verifiedEmail, tokensRemaining } = useApp();

  return (
    <header className="fixed top-0 w-full z-50 h-16 bg-black/80 backdrop-blur-md border-b border-cyan-500/20 flex justify-center items-center">
      <div className="w-full max-w-[480px] h-full flex items-center justify-between px-4">
        <button onClick={onMenuToggle} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <Menu className="w-5 h-5 text-cyan-200" />
        </button>
        <a
          href="/"
          onClick={onHomeClick}
          className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <img src="/logo.svg" alt="SetupAura AI Logo" className="w-9 h-9 rounded-md shadow-[0_0_18px_rgba(6,182,212,0.35)]" />
          <span className="text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-sky-200">
            SetupAura AI
          </span>
        </a>
        {verifiedEmail ? (
          <div className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-300/30 text-[11px] font-bold text-cyan-200">
            Tokens: {tokensRemaining}
          </div>
        ) : (
          <div className="w-9" />
        )}
      </div>
    </header>
  );
};
