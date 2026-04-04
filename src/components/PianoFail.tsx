import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Music, AlertCircle, Trophy } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

interface PianoFailProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

export default function PianoFail({ lesson, onComplete, onBack }: PianoFailProps) {
  const { currentUser, studentActivity, updateGameProgress, completeActivity } = useAppStore();
  const [level, setLevel] = useState(0);
  const [targetPhrase, setTargetPhrase] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const startLevel = (lvl: number) => {
    if (!lesson.phrases[lvl % lesson.phrases.length]) return;
    setTargetPhrase(lesson.phrases[lvl % lesson.phrases.length].toUpperCase());
    setGuessedLetters([]);
    setMistakes(0);
    setShowSuccess(false);
  };

  useEffect(() => {
    // Load progress
    if (currentUser) {
      const progress = studentActivity[currentUser]?.gameProgress?.[lesson.id]?.piano;
      if (progress) {
        setLevel(progress.level);
        startLevel(progress.level);
      } else {
        startLevel(0);
      }
    }
  }, [currentUser, lesson.id]);

  const playNote = (key: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      
      // Determine pitch based on row
      const row1 = 'QWERTYUIOP';
      const row2 = 'ASDFGHJKL';
      const row3 = 'ZXCVBNM';
      
      let baseFreq = 261.63; // C4
      if (row1.includes(key)) baseFreq = 130.81; // C3 (Low)
      if (row2.includes(key)) baseFreq = 261.63; // C4 (Medium)
      if (row3.includes(key)) baseFreq = 523.25; // C5 (High)
      
      const charIndex = row1.includes(key) ? row1.indexOf(key) : row2.includes(key) ? row2.indexOf(key) : row3.indexOf(key);
      const freq = baseFreq * Math.pow(1.059463, charIndex);
      
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio context failed', e);
    }
  };

  const handleKeyPress = (letter: string) => {
    if (showSuccess || mistakes >= 6) return;
    
    setActiveKey(letter);
    setTimeout(() => setActiveKey(null), 150);
    playNote(letter);

    if (guessedLetters.includes(letter)) return;

    setGuessedLetters([...guessedLetters, letter]);
    if (!targetPhrase.includes(letter)) {
      setMistakes(mistakes + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetPhrase, guessedLetters, mistakes, showSuccess]);

  const isWon = targetPhrase.split('').every(char => char === ' ' || guessedLetters.includes(char));

  const playPhraseAsSong = async () => {
    const letters = targetPhrase.replace(/\s/g, '').split('');
    for (const char of letters) {
      playNote(char);
      setActiveKey(char);
      await new Promise(resolve => setTimeout(resolve, 150)); // Faster (was 300)
      setActiveKey(null);
      await new Promise(resolve => setTimeout(resolve, 50)); // Faster (was 100)
    }
  };

  useEffect(() => {
    if (isWon && targetPhrase && !showSuccess) {
      setShowSuccess(true);
      const finishLevel = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await playPhraseAsSong();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (level === 9) {
          confetti({ particleCount: 150, spread: 70 });
          completeActivity(lesson.id, 'piano');
          setTimeout(onComplete, 2000);
        } else {
          const nextLevel = level + 1;
          updateGameProgress(lesson.id, 'piano', { level: nextLevel, score: 0 });
          setLevel(nextLevel);
          startLevel(nextLevel);
        }
      };
      finishLevel();
    }
  }, [isWon, targetPhrase, showSuccess, level, lesson.id, onComplete, completeActivity, updateGameProgress]);

  useEffect(() => {
    if (mistakes >= 6) {
      setTimeout(() => startLevel(level), 2000);
    }
  }, [mistakes, level]);

  const row1 = 'QWERTYUIOP'.split('');
  const row2 = 'ASDFGHJKL'.split('');
  const row3 = 'ZXCVBNM'.split('');

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Phrase {level + 1}/10</h2>
          <div className="flex gap-2 justify-center mt-2">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i < mistakes ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <AnimatePresence mode="wait">
          <motion.div 
            key={targetPhrase}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: showSuccess ? 1.1 : 1 }}
            className={`flex flex-wrap justify-center gap-x-4 gap-y-6 transition-all duration-500 ${showSuccess ? 'text-indigo-600' : ''}`}
          >
            {targetPhrase.split(' ').map((word, wordIdx) => (
              <div key={wordIdx} className="flex gap-2">
                {word.split('').map((char, charIdx) => (
                  <div 
                    key={charIdx}
                    className={`w-8 h-10 sm:w-10 sm:h-12 border-b-4 flex items-center justify-center text-2xl sm:text-3xl font-black transition-all ${
                      guessedLetters.includes(char) ? 'border-indigo-600 text-slate-900' : 'border-slate-300 text-transparent'
                    }`}
                  >
                    {guessedLetters.includes(char) ? char : ''}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {mistakes >= 6 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-sm">
            <AlertCircle size={20} /> RESTARTING...
          </motion.div>
        )}

        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-sm">
            <Trophy size={20} /> AMAZING!
          </motion.div>
        )}

        {/* Piano Keyboard */}
        <div className="w-full max-w-3xl mt-auto pb-12 space-y-2">
          {[row1, row2, row3].map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-1">
              {row.map(key => {
                const isCorrect = guessedLetters.includes(key) && targetPhrase.includes(key);
                const isWrong = guessedLetters.includes(key) && !targetPhrase.includes(key);
                
                return (
                  <button
                    key={key}
                    onMouseDown={() => handleKeyPress(key)}
                    className={`relative h-24 w-8 sm:w-10 rounded-b-xl transition-all ${
                      activeKey === key 
                        ? 'bg-indigo-500 translate-y-2 shadow-inner' 
                        : isCorrect
                          ? 'bg-emerald-100 shadow-[0_6px_0_#10b981]'
                          : isWrong
                            ? 'bg-rose-100 shadow-[0_6px_0_#f43f5e]'
                            : 'bg-white hover:bg-slate-50 shadow-[0_6px_0_#e2e8f0]'
                    }`}
                  >
                    <span className={cn(
                      "absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-black",
                      isCorrect ? "text-emerald-600" : isWrong ? "text-rose-600" : "text-slate-500"
                    )}>{key}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
