import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

export default function WordOfTheDay() {
  const { getWordOfTheDay, submitWordOfTheDay, wordOfTheDay, memoryMasterScore, currentUser } = useAppStore();
  const [guess, setGuess] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    if (currentUser && !wordOfTheDay[currentUser]) {
      getWordOfTheDay();
    }
  }, [getWordOfTheDay, currentUser, wordOfTheDay]);

  const currentWotd = currentUser ? wordOfTheDay[currentUser] : null;
  const currentScore = currentUser ? (memoryMasterScore[currentUser] || 0) : 0;

  if (!currentWotd) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentWotd.completed || !guess.trim()) return;

    const isCorrect = submitWordOfTheDay(guess.trim());
    if (isCorrect) {
      setStatus('correct');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      setStatus('wrong');
      setTimeout(() => setStatus('idle'), 2000);
    }
    setGuess('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-xl border-2 border-slate-100 mb-8 md:mb-12 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 md:opacity-10 group-hover:opacity-20 transition-opacity">
        <Trophy size={80} className="text-indigo-600 md:w-[120px] md:h-[120px]" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-2xl shrink-0">
              <Sparkles className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900">Word of the Day</h3>
              <p className="text-xs md:text-sm font-medium text-slate-500">Memory Master Ranking: <span className="text-indigo-600 font-black">{currentScore}</span></p>
            </div>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl self-start sm:self-auto">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Daily Challenge</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-10">
          <div className="text-center lg:text-left flex-1 w-full">
            <span className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-widest mb-2 block">Translate this word:</span>
            <h4 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-2 break-words leading-tight">{currentWotd.word}</h4>
          </div>

          <div className="w-full lg:w-auto shrink-0">
            {currentWotd.completed ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-3 px-6 md:px-10 py-4 md:py-6 bg-emerald-50 text-emerald-600 rounded-2xl md:rounded-3xl border-2 border-emerald-100 font-black text-sm md:text-base text-center"
              >
                <CheckCircle2 size={24} className="shrink-0" />
                <span>Correct! Come back tomorrow.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Type translation..."
                    className={cn(
                      "px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-900 w-full lg:w-72 text-lg",
                      status === 'wrong' ? "border-rose-500 animate-shake" : "border-slate-100 focus:border-indigo-500"
                    )}
                  />
                  <AnimatePresence>
                    {status === 'wrong' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"
                      >
                        <XCircle size={16} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="submit"
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all text-lg whitespace-nowrap"
                >
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
