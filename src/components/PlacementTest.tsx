import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Video, MessageSquare, Star, X, Loader2, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { PlacementTest as PlacementTestData } from '../services/geminiService';

interface PlacementTestProps {
  subject: string;
  test: PlacementTestData;
  onComplete: (answers: Record<number, number>) => void;
  onCancel: () => void;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ subject, test, onComplete, onCancel }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  const handleSelect = (optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: optionIdx }));
    if (currentQuestion < test.questions.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      setIsFinished(true);
    }
  };

  const q = test.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / test.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[40px] border-2 border-slate-200 shadow-sm overflow-hidden p-8 space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="h-4 flex-1 mx-8 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-indigo-500"
          />
        </div>
        <div className="text-sm font-black text-indigo-600 uppercase tracking-widest">
          {currentQuestion + 1} / {test.questions.length}
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4 text-center">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
            {q.difficulty} level
          </span>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">
            {q.question}
          </h2>
        </div>

        <div className="grid gap-4">
          {q.options.map((option, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(idx)}
              className={cn(
                "p-6 rounded-2xl border-2 text-left font-bold transition-all text-lg flex items-center justify-between",
                answers[currentQuestion] === idx
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_4px_0_0_rgba(99,102,241,1)]"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 shadow-[0_4px_0_0_rgba(226,232,240,1)]"
              )}
            >
              <span>{option}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {isFinished && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8"
        >
          <button
            onClick={() => onComplete(answers)}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_0_rgba(67,56,202,1)] hover:translate-y-1 hover:shadow-[0_2px_0_0_rgba(67,56,202,1)] transition-all"
          >
            FINISH TEST
          </button>
        </motion.div>
      )}
    </div>
  );
};
