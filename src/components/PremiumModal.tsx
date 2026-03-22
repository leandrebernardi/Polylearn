import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Video, MessageSquare, Star, X, Loader2, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate verification
    setTimeout(() => {
      if (code === '1234') {
        onSuccess();
        onClose();
      } else {
        setError('Invalid premium code. Try again!');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border-b-8 border-slate-200"
          >
            <div className="bg-indigo-600 p-8 text-white text-center relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <ShieldCheck className="w-12 h-12" />
              </div>
              
              <h2 className="text-3xl font-black mb-2 tracking-tight">PolyLearn Premium</h2>
              <p className="text-indigo-100 font-bold opacity-80 uppercase text-xs tracking-widest">Unlock the full experience</p>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Unlimited Video Calls</h4>
                    <p className="text-xs text-slate-500 font-bold">Practice with native speakers anytime</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Advanced AI Tutor</h4>
                    <p className="text-xs text-slate-500 font-bold">Deeper explanations and personalized feedback</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">No Ads & Bonus XP</h4>
                    <p className="text-xs text-slate-500 font-bold">Focus on learning and level up faster</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Enter Premium Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="XXXX"
                      className={cn(
                        "w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-center text-2xl tracking-[0.5em] outline-none transition-all focus:border-indigo-500 focus:bg-white",
                        error && "border-rose-500 bg-rose-50"
                      )}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  </div>
                  {error && <p className="text-xs text-rose-500 font-bold text-center mt-2">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_0_rgba(67,56,202,1)] hover:translate-y-1 hover:shadow-[0_2px_0_0_rgba(67,56,202,1)] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ACTIVATE PREMIUM'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
