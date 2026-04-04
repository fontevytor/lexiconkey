import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Heart } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';

interface HangmanProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

export default function Hangman({ lesson, onComplete, onBack }: HangmanProps) {
  const { currentUser, studentActivity, updateGameProgress, completeActivity } = useAppStore();
  const [level, setLevel] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const maxMistakes = 6;

  const startLevel = (lvl: number) => {
    const word = lesson.vocabulary[lvl % lesson.vocabulary.length].word.toUpperCase();
    setTargetWord(word);
    setGuessedLetters([]);
    setMistakes(0);
  };

  useEffect(() => {
    // Load progress
    if (currentUser) {
      const progress = studentActivity[currentUser]?.gameProgress?.[lesson.id]?.hangman;
      if (progress) {
        setLevel(progress.level);
        startLevel(progress.level);
      } else {
        startLevel(0);
      }
    }
  }, [currentUser, lesson.id, studentActivity]);

  const handleGuess = (letter: string) => {
    if (guessedLetters.includes(letter) || mistakes >= maxMistakes || isWon || isLost) return;

    setGuessedLetters([...guessedLetters, letter]);
    if (!targetWord.includes(letter)) {
      setMistakes(mistakes + 1);
    }
  };

  const isWon = targetWord.length > 0 && targetWord.split('').every(char => guessedLetters.includes(char));
  const isLost = mistakes >= maxMistakes;

  useEffect(() => {
    if (isWon) {
      if (level === 9) {
        confetti({ particleCount: 150, spread: 70 });
        completeActivity(lesson.id, 'hangman');
        setTimeout(onComplete, 2000);
      } else {
        const nextLevel = level + 1;
        updateGameProgress(lesson.id, 'hangman', { level: nextLevel, score: 0 });
        setTimeout(() => {
          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 1000);
      }
    }
  }, [isWon]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        handleGuess(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guessedLetters, mistakes, isWon, isLost]);

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto bg-slate-50">
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-600 shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Level {level + 1}/10</h2>
          <div className="flex gap-2 justify-center mt-3">
            {[...Array(maxMistakes)].map((_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{ scale: i < maxMistakes - mistakes ? 1 : 0.8, opacity: i < maxMistakes - mistakes ? 1 : 0.3 }}
              >
                <Heart 
                  size={24} 
                  className={i < maxMistakes - mistakes ? "fill-rose-500 text-rose-500" : "text-slate-300"} 
                />
              </motion.div>
            ))}
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-16">
        {/* Hangman Drawing */}
        <div className="relative w-64 h-80">
          <svg viewBox="0 0 100 120" className="w-full h-full stroke-slate-200 stroke-[4] fill-none">
            {/* Gallows */}
            <path d="M20 110 L80 110 M30 110 L30 10 L70 10 L70 25" strokeLinecap="round" />
            
            <AnimatePresence>
              {/* Head */}
              {mistakes >= 1 && (
                <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} cx="70" cy="35" r="10" stroke="currentColor" className="text-slate-400" />
              )}
              {/* Body */}
              {mistakes >= 2 && (
                <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1="70" y1="45" x2="70" y2="75" stroke="currentColor" className="text-slate-400" strokeLinecap="round" />
              )}
              {/* Left Arm */}
              {mistakes >= 3 && (
                <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1="70" y1="50" x2="55" y2="65" stroke="currentColor" className="text-slate-400" strokeLinecap="round" />
              )}
              {/* Right Arm */}
              {mistakes >= 4 && (
                <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1="70" y1="50" x2="85" y2="65" stroke="currentColor" className="text-slate-400" strokeLinecap="round" />
              )}
              {/* Left Leg */}
              {mistakes >= 5 && (
                <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1="70" y1="75" x2="55" y2="95" stroke="currentColor" className="text-slate-400" strokeLinecap="round" />
              )}
              {/* Right Leg */}
              {mistakes >= 6 && (
                <motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} x1="70" y1="75" x2="85" y2="95" stroke="currentColor" className="text-slate-400" strokeLinecap="round" />
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* Word Display */}
        <div className="flex gap-4 flex-wrap justify-center">
          {targetWord.split('').map((char, i) => (
            <div 
              key={i}
              className="w-14 h-16 border-b-4 border-slate-200 flex items-center justify-center text-5xl font-black text-slate-800"
            >
              <AnimatePresence mode="wait">
                {guessedLetters.includes(char) && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10, scale: 0.5 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="text-indigo-600"
                  >
                    {char}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-3 w-full max-w-2xl">
          {alphabet.map(letter => {
            const isGuessed = guessedLetters.includes(letter);
            const isCorrect = isGuessed && targetWord.includes(letter);
            const isWrong = isGuessed && !targetWord.includes(letter);

            return (
              <button
                key={letter}
                disabled={isGuessed || isLost || isWon}
                onClick={() => handleGuess(letter)}
                className={`h-14 rounded-2xl font-black text-lg transition-all shadow-sm ${
                  isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                  isWrong ? 'bg-rose-50 text-rose-200 border-2 border-rose-100' :
                  isGuessed ? 'bg-slate-100 text-slate-300' :
                  'bg-white hover:bg-white text-slate-600 hover:scale-105 hover:shadow-md hover:border-indigo-200 border-2 border-transparent'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {isLost && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="text-center bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-rose-100 max-w-md w-full"
          >
            <p className="text-rose-500 font-black mb-2 uppercase tracking-widest text-sm">Game Over</p>
            <h3 className="text-3xl font-black text-slate-800 mb-8">The word was <span className="text-indigo-600">{targetWord}</span></h3>
            <button 
              onClick={() => startLevel(level)}
              className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-[2rem] font-black shadow-xl shadow-rose-500/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
