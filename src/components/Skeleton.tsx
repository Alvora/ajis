import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClass = "bg-stone-200 dark:bg-stone-800 animate-pulse";
  const variantClass = {
    text: "h-4 w-3/4 rounded",
    rect: "h-24 w-full rounded-xl",
    circle: "h-12 w-12 rounded-full"
  };

  return (
    <div className={`${baseClass} ${variantClass[variant]} ${className}`} />
  );
};

export const PageSkeleton = () => (
  <div className="p-8 space-y-8 max-w-7xl mx-auto">
    <div className="flex justify-between items-center">
      <div className="space-y-3 w-1/3">
        <Skeleton variant="text" className="w-1/2 h-8" />
        <Skeleton variant="text" className="w-full h-4" />
      </div>
      <Skeleton className="w-32 h-10 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64" />
  </div>
);

export default Skeleton;
