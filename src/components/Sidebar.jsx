import { X, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { tokensRemaining, isPremium, verifiedEmail } = useApp();
  const tierLabel = isPremium ? 'Premium Access' : 'Free Access';
  const tokenLabel = `${tokensRemaining} Generations Left`;

  return (
    <>
      {isOpen && <button onClick={onClose} className="fixed inset-0 z-[70] bg-black/60" />}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#0b1020] border-r border-cyan-500/20 z-[80] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-300 uppercase tracking-wider">{tierLabel}</p>
            <p className="text-white font-bold mt-1">{tokenLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Token Balance</span>
            </div>
            <p className="text-2xl font-black text-white mt-2">{tokensRemaining}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">User</p>
            <p className="text-sm text-white mt-2 break-all">{verifiedEmail || 'Guest'}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
