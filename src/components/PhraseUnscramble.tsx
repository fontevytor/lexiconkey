import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { ChevronLeft, Trophy, RefreshCw, Music } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

interface PhraseUnscrambleProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

export default function PhraseUnscramble({ lesson, onComplete, onBack }: PhraseUnscrambleProps) {
  const { currentUser, studentActivity, updateGameProgress, completeActivity } = useAppStore();
  const [level, setLevel] = useState(0);
  const [targetPhrase, setTargetPhrase] = useState('');
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (freq: number, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio failed', e);
    }
  };

  const startLevel = (lvl: number) => {
    const phrases = lesson.phrases;
    if (!phrases || phrases.length === 0) return;
    
    // Get a random phrase that hasn't been used or just a random one
    const phrase = phrases[lvl % phrases.length].toUpperCase();
    setTargetPhrase(phrase);
    
    const words = phrase.split(' ');
    // Shuffle words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    // Ensure it's actually scrambled
    if (shuffled.join(' ') === words.join(' ') && words.length > 1) {
      shuffled.reverse();
    }
    
    setScrambledWords(shuffled);
    setCurrentOrder([]);
    setShowSuccess(false);
  };

  useEffect(() => {
    if (currentUser) {
      const progress = studentActivity[currentUser]?.gameProgress?.[lesson.id]?.phraseUnscramble;
      if (progress) {
        setLevel(progress.level);
        startLevel(progress.level);
      } else {
        startLevel(0);
      }
    }
  }, [currentUser, lesson.id]);

  const handleWordClick = (word: string, index: number) => {
    if (showSuccess) return;
    
    const nextWordIndex = currentOrder.length;
    const targetWords = targetPhrase.split(' ');
    
    if (word === targetWords[nextWordIndex]) {
      playSound(440 + nextWordIndex * 50, 'sine');
      const newOrder = [...currentOrder, word];
      setCurrentOrder(newOrder);
      
      // Remove from scrambled words
      const newScrambled = [...scrambledWords];
      newScrambled.splice(index, 1);
      setScrambledWords(newScrambled);

      if (newOrder.length === targetWords.length) {
        handleWin();
      }
    } else {
      playSound(150, 'sawtooth');
      // Shake effect or something?
    }
  };

  const handleWin = async () => {
    setShowSuccess(true);
    playSound(880, 'sine');
    setTimeout(() => playSound(1100, 'sine'), 100);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (level >= 4) { // 5 levels to win a star
      confetti({ particleCount: 150, spread: 70 });
      completeActivity(lesson.id, 'phraseUnscramble');
      setTimeout(onComplete, 2000);
    } else {
      const nextLevel = level + 1;
      updateGameProgress(lesson.id, 'phraseUnscramble', { level: nextLevel, score: 0 });
      setLevel(nextLevel);
      startLevel(nextLevel);
    }
  };

  const resetLevel = () => {
    startLevel(level);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Phrase Unscramble</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Level {level + 1}/5</p>
        </div>
        <button onClick={resetLevel} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        {/* Target Area */}
        <div className="w-full min-h-[120px] p-8 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-wrap justify-center items-center gap-3 shadow-inner">
          <AnimatePresence mode="popLayout">
            {currentOrder.map((word, i) => (
              <motion.div
                key={`${word}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-indigo-500/20"
              >
                {word}
              </motion.div>
            ))}
          </AnimatePresence>
          {currentOrder.length === 0 && (
            <p className="text-slate-300 font-black text-xl uppercase tracking-widest">Click words in order</p>
          )}
        </div>

        {/* Scrambled Words */}
        <div className="flex flex-wrap justify-center gap-4">
          <AnimatePresence mode="popLayout">
            {scrambledWords.map((word, i) => (
              <motion.button
                key={`${word}-${i}`}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ y: -4, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleWordClick(word, i)}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl font-black text-xl text-slate-800 shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all"
              >
                {word}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {showSuccess && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Trophy size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Perfect!</h3>
          </motion.div>
        )}
      </div>

      <div className="mt-auto pb-8 text-center">
        <p className="text-slate-400 font-medium text-sm">
          Form the correct phrase using the blocks below.
        </p>
      </div>
    </div>
  );
}
