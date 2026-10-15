import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-3xl',
  };

  return (
    <div className={cn(
      "rounded-full bg-[#F5F2ED] flex items-center justify-center font-black border-2 border-brand-green/20 shadow-sm overflow-hidden",
      sizeClasses[size],
      className
    )}>
      <span className="text-brand-red">B</span>
      <span className="text-stone-400">&</span>
      <span className="text-brand-green">G</span>
    </div>
  );
};
