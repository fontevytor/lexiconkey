import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ArrowLeft, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Vocabulary } from '../data/lessons';

interface WordScrambleProps {
  vocabulary: Vocabulary[];
  onComplete: () => void;
  onClose: () => void;
}

export const WordScramble: React.FC<WordScrambleProps> = ({ vocabulary, onComplete, onClose }) => {
  const [level, setLevel] = useState(0);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentWord = vocabulary[level % vocabulary.length];
  const targetWord = currentWord.word.toUpperCase();

  useEffect(() => {
    const letters = targetWord.split('');
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setShuffledLetters(shuffled);
    setUserInput([]);
    setIsCorrect(null);
  }, [level, targetWord]);

  const handleLetterClick = (letter: string, index: number) => {
    if (isCorrect) return;
    
    const newInput = [...userInput, letter];
    setUserInput(newInput);
    
    const newShuffled = [...shuffledLetters];
    newShuffled.splice(index, 1);
    setShuffledLetters(newShuffled);

    if (newInput.length === targetWord.length) {
      if (newInput.join('') === targetWord) {
        setIsCorrect(true);
        if (level === 9) {
          confetti();
          setShowSuccess(true);
          onComplete();
        } else {
          setTimeout(() => {
            setLevel(prev => prev + 1);
          }, 1000);
        }
      } else {
        setIsCorrect(false);
        setTimeout(() => {
          // Reset level
          const letters = targetWord.split('');
          setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
          setUserInput([]);
          setIsCorrect(null);
        }, 1500);
      }
    }
  };

  const handleRemoveLetter = (index: number) => {
    if (isCorrect) return;
    
    const letter = userInput[index];
    const newInput = [...userInput];
    newInput.splice(index, 1);
    setUserInput(newInput);
    
    setShuffledLetters(prev => [...prev, letter]);
    setIsCorrect(null);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="font-bold text-lg">Level {level + 1}/10</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-12 text-center"
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Translate to English</h2>
                <p className="text-5xl font-black text-indigo-600 uppercase tracking-wider">
                  {currentWord.translation}
                </p>
              </div>

              {/* Answer Slots */}
              <div className="flex flex-wrap justify-center gap-2 min-h-[64px]">
                {targetWord.split('').map((_, i) => (
                  <motion.button
                    key={`slot-${i}`}
                    whileHover={{ scale: userInput[i] ? 1.05 : 1 }}
                    onClick={() => userInput[i] && handleRemoveLetter(i)}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all
                      ${userInput[i] 
                        ? 'bg-white border-indigo-600 text-indigo-600 shadow-md cursor-pointer' 
                        : 'bg-gray-50 border-dashed border-gray-300'
                      }
                      ${isCorrect === true ? 'border-green-500 bg-green-50 text-green-700' : ''}
                      ${isCorrect === false ? 'border-red-500 bg-red-50 text-red-700' : ''}
                    `}
                  >
                    {userInput[i]}
                  </motion.button>
                ))}
              </div>

              {/* Letter Bank */}
              <div className="flex flex-wrap justify-center gap-3">
                {shuffledLetters.map((letter, i) => (
                  <motion.button
                    key={`letter-${i}-${letter}`}
                    layout
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleLetterClick(letter, i)}
                    className="w-12 h-14 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 transition-all shadow-sm"
                  >
                    {letter}
                  </motion.button>
                ))}
              </div>

              {isCorrect === false && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-red-600 font-bold"
                >
                  <XCircle className="w-6 h-6" />
                  Try again!
                </motion.div>
              )}
              
              {isCorrect === true && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-green-600 font-bold"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Correct!
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Star className="w-12 h-12 text-green-600 fill-green-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Amazing Work!</h2>
              <p className="text-xl text-gray-600">You've mastered the Word Scramble for this lesson!</p>
              <button
                onClick={onClose}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Continue Learning
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
