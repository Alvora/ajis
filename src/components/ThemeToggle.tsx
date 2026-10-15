import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Monitor, Eye, EyeOff } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, setTheme, accessibility, setAccessibility } = useTheme();

  return (
    <div className="relative group">
      <button className="p-2 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2">
        {theme === 'light' && <Sun size={18} />}
        {theme === 'dark' && <Moon size={18} />}
        {theme === 'system' && <Monitor size={18} />}
        <div className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1"></div>
        {accessibility === 'none' ? <EyeOff size={18} className="text-stone-400" /> : <Eye size={18} className="text-brand-green" />}
      </button>
      
      <div className="absolute right-0 top-full mt-2 w-56 bg-bg-main border border-stone-200/20 rounded-2xl shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden text-text-main">
        <div className="p-2 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold opacity-50 uppercase tracking-widest">Thème</div>
          <button onClick={() => setTheme('light')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${theme === 'light' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <Sun size={16} /> Clair
          </button>
          <button onClick={() => setTheme('dark')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${theme === 'dark' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <Moon size={16} /> Sombre
          </button>
          <button onClick={() => setTheme('system')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${theme === 'system' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <Monitor size={16} /> Système
          </button>
          
          <div className="h-px bg-stone-500/10 my-2"></div>
          
          <div className="px-3 py-1 text-[10px] font-bold opacity-50 uppercase tracking-widest">Accessibilité</div>
          <button onClick={() => setAccessibility('none')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${accessibility === 'none' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <EyeOff size={16} /> Standard
          </button>
          <button onClick={() => setAccessibility('red-green')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${accessibility === 'red-green' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <Eye size={16} /> Daltonisme (R/V)
          </button>
          <button onClick={() => setAccessibility('tritanopia')} className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${accessibility === 'tritanopia' ? 'bg-stone-500/10 font-bold' : 'hover:bg-stone-500/5'}`}>
            <Eye size={16} /> Tritanopie
          </button>
        </div>
      </div>
    </div>
  );
};
