import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Check, X, RotateCcw, Star } from 'lucide-react';
import { LessonData, Vocabulary } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { speak } from '../lib/tts';

interface FlashcardsProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

export default function Flashcards({ lesson, onComplete, onBack }: FlashcardsProps) {
  const [pool, setPool] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const { currentUser, completeActivity, updateVocabStats, updateStudentActivity, toggleFavoriteCard, favoriteCards, incrementViewCount, userStats } = useAppStore();

  useEffect(() => {
    setPool([...lesson.vocabulary].sort(() => Math.random() - 0.5));
  }, [lesson]);

  useEffect(() => {
    if (currentUser && currentUser !== 'teacher' && pool.length > 0) {
      updateStudentActivity(currentUser, { 
        lessonId: lesson.id, 
        wordIndex: currentIndex 
      });
      incrementViewCount(pool[currentIndex].word);
    }
  }, [currentIndex, pool, currentUser, lesson.id, incrementViewCount]);

  useEffect(() => {
    if (pool.length > 0 && !isFlipped) {
      speak(pool[currentIndex].word);
    }
  }, [currentIndex, pool, isFlipped]);

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (!nextFlipped && pool[currentIndex]) {
      speak(pool[currentIndex].word);
    }
  };

  const handleDifficulty = (level: number) => {
    updateVocabStats(pool[currentIndex].word, { difficulty: level });
  };

  const handleResponse = (ok: boolean) => {
    if (ok) {
      const newCompleted = completedCount + 1;
      setCompletedCount(newCompleted);
      if (newCompleted === lesson.vocabulary.length) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        completeActivity(lesson.id, 'flashcards');
        setTimeout(onComplete, 2000);
      } else {
        setIsFlipped(false);
        setCurrentIndex(currentIndex + 1);
      }
    } else {
      // Move current card to a random position later in the pool
      const newPool = [...pool];
      const currentCard = newPool.splice(currentIndex, 1)[0];
      const randomPos = Math.floor(Math.random() * (newPool.length - currentIndex)) + currentIndex;
      newPool.splice(randomPos, 0, currentCard);
      
      setIsFlipped(false);
      setPool(newPool);
      // We don't increment currentIndex because the "new" card at currentIndex is the one we just moved to or the next one
    }
  };

  if (pool.length === 0 || currentIndex >= pool.length) return null;

  const currentCard = pool[currentIndex];
  const isFavorite = currentUser && currentCard ? (favoriteCards[currentUser] || []).includes(currentCard.word) : false;
  const progress = (completedCount / lesson.vocabulary.length) * 100;

  return (
    <div className="h-full flex flex-col p-6 max-w-2xl mx-auto bg-white/50 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 mx-8">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-100">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-black text-slate-900">
          {completedCount}/{lesson.vocabulary.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <div className="relative w-full aspect-[4/3] perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.word + currentIndex}
              initial={{ y: 50, opacity: 0, rotateX: -10 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: -50, opacity: 0, rotateX: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="w-full h-full cursor-pointer preserve-3d"
              onClick={handleFlip}
            >
              <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-200 rounded-3xl flex items-center justify-center p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavoriteCard(currentCard.word); }}
                    className={cn(
                      "absolute top-6 right-6 p-3 rounded-2xl transition-all",
                      isFavorite ? "bg-amber-100 text-amber-500" : "bg-slate-50 text-slate-300 hover:text-slate-400"
                    )}
                  >
                    <Star size={24} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                  <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight text-center">
                    {currentCard.word}
                  </h2>
                  <p className="absolute bottom-6 text-slate-500 text-xs font-black uppercase tracking-widest">Click to flip</p>
                </div>

                {/* Back */}
                <div 
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-indigo-400 rounded-3xl flex flex-col items-center justify-center p-8 shadow-2xl"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight text-center mb-8">
                    {currentCard.translation}
                  </h2>
                  
                  <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                    <p className="text-indigo-100 text-xs font-black uppercase tracking-widest text-center mb-3">Rate Difficulty (0-10)</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[...Array(11)].map((_, i) => {
                        const currentDifficulty = currentUser ? userStats[currentUser]?.[currentCard.word]?.difficulty : 0;
                        return (
                          <button
                            key={i}
                            onClick={() => handleDifficulty(i)}
                            className={cn(
                              "w-7 h-7 rounded-lg text-[10px] font-black transition-all border",
                              currentDifficulty === i 
                                ? "bg-white text-indigo-600 border-white shadow-lg scale-110" 
                                : "bg-white/10 text-white border-white/20 hover:bg-white/30"
                            )}
                          >
                            {i}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-6 w-full">
          <button
            onClick={(e) => { e.stopPropagation(); handleResponse(false); }}
            className="flex-1 flex items-center justify-center gap-2 py-5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-2 border-slate-200 hover:border-rose-200 rounded-2xl transition-all font-black text-lg shadow-sm"
          >
            <X size={24} />
            Not Okay
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleResponse(true); }}
            className="flex-1 flex items-center justify-center gap-2 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl transition-all font-black text-lg shadow-xl shadow-indigo-500/20"
          >
            <Check size={24} />
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
