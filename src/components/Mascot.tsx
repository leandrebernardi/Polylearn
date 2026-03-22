import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export type MascotMood = 'happy' | 'thinking' | 'excited' | 'sad' | 'surprised';

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mood?: MascotMood;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({ size = 'md', mood = 'happy', className }) => {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56'
  };

  const getMoodExpression = () => {
    switch (mood) {
      case 'excited':
        return (
          <div className="flex flex-col items-center">
            <div className="flex gap-3 mb-1">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-3 h-3 bg-white rounded-full" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.25 }} className="w-3 h-3 bg-white rounded-full" />
            </div>
            <div className="w-6 h-4 bg-white rounded-full" />
          </div>
        );
      case 'thinking':
        return (
          <div className="flex flex-col items-center">
            <div className="flex gap-3 mb-1">
              <div className="w-3 h-1 bg-white rounded-full rotate-12" />
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <div className="w-4 h-1 bg-white rounded-full" />
          </div>
        );
      case 'sad':
        return (
          <div className="flex flex-col items-center">
            <div className="flex gap-3 mb-2">
              <div className="w-2 h-2 bg-white rounded-full opacity-70" />
              <div className="w-2 h-2 bg-white rounded-full opacity-70" />
            </div>
            <div className="w-4 h-1 bg-white rounded-full opacity-70" />
          </div>
        );
      case 'surprised':
        return (
          <div className="flex flex-col items-center">
            <div className="flex gap-3 mb-1">
              <div className="w-3 h-3 bg-white rounded-full" />
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <div className="w-4 h-4 bg-white rounded-full" />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center">
            <div className="flex gap-3 mb-1">
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div className="w-5 h-2 bg-white rounded-full" />
          </div>
        );
    }
  };

  return (
    <motion.div
      animate={{ 
        y: [0, -8, 0],
        rotate: mood === 'excited' ? [-2, 2, -2] : 0
      }}
      transition={{ 
        y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
        rotate: { repeat: Infinity, duration: 0.5, ease: "easeInOut" }
      }}
      className={cn(
        "relative flex items-center justify-center bg-indigo-500 rounded-3xl shadow-xl border-4 border-white overflow-hidden",
        sizes[size],
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
      
      {/* Eyes and Mouth */}
      <div className="relative z-10">
        {getMoodExpression()}
      </div>

      {/* Wings/Ears */}
      <motion.div 
        animate={{ rotate: mood === 'excited' ? [-20, -10, -20] : -12 }}
        className="absolute -left-1 top-1/2 w-4 h-8 bg-indigo-400 rounded-full origin-right" 
      />
      <motion.div 
        animate={{ rotate: mood === 'excited' ? [20, 10, 20] : 12 }}
        className="absolute -right-1 top-1/2 w-4 h-8 bg-indigo-400 rounded-full origin-left" 
      />
      
      {/* Shine */}
      <div className="absolute top-2 left-2 w-4 h-4 bg-white/20 rounded-full blur-sm" />
    </motion.div>
  );
};
