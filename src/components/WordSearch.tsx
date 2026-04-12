import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { cn } from '../lib/utils';

interface WordSearchProps {
  lesson: LessonData;
  onClose: () => void;
}

interface Cell {
  char: string;
  row: number;
  col: number;
  isFound: boolean;
  isSelected: boolean;
  isHint?: boolean;
}

export default function WordSearch({ lesson, onClose }: WordSearchProps) {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<{ word: string; found: boolean; positions: {r: number, c: number}[] }[]>([]);
  const [selection, setSelection] = useState<{ row: number; col: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastFoundTime, setLastFoundTime] = useState(Date.now());
  const [hintCount, setHintCount] = useState(0);
  const gridSize = 10;

  const generateGrid = useCallback(() => {
    const newGrid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const words = [...lesson.vocabulary]
      .map(v => v.word.toUpperCase())
      .filter(w => w.length <= gridSize)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    const placedWords: { word: string; found: boolean; positions: {r: number, c: number}[] }[] = [];

    words.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        const directions = [
          { r: 0, c: 1 },  // H
          { r: 1, c: 0 },  // V
          { r: 1, c: 1 },  // D
        ];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * (gridSize - (dir.r * word.length)));
        const col = Math.floor(Math.random() * (gridSize - (dir.c * word.length)));

        let canPlace = true;
        const positions: {r: number, c: number}[] = [];
        for (let i = 0; i < word.length; i++) {
          const r = row + (dir.r * i);
          const c = col + (dir.c * i);
          if (newGrid[r][c] !== '' && newGrid[r][c] !== word[i]) {
            canPlace = false;
            break;
          }
          positions.push({ r, c });
        }

        if (canPlace) {
          positions.forEach((pos, i) => {
            newGrid[pos.r][pos.c] = word[i];
          });
          placed = true;
          placedWords.push({ word, found: false, positions });
        }
        attempts++;
      }
    });

    // Fill empty cells
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const finalGrid: Cell[][] = newGrid.map((row, r) =>
      row.map((char, c) => ({
        char: char || alphabet[Math.floor(Math.random() * alphabet.length)],
        row: r,
        col: c,
        isFound: false,
        isSelected: false
      }))
    );

    setGrid(finalGrid);
    setWordsToFind(placedWords);
    setSelection([]);
    setLastFoundTime(Date.now());
    setHintCount(0);
  }, [lesson.vocabulary]);

  useEffect(() => {
    generateGrid();
  }, [generateGrid]);

  // Hint System
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastFoundTime > 60000 && hintCount < 8) {
        // Show hint
        const unfoundWords = wordsToFind.filter(w => !w.found);
        if (unfoundWords.length > 0) {
          const randomWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
          const randomPos = randomWord.positions[Math.floor(Math.random() * randomWord.positions.length)];
          
          setGrid(prev => {
            const newGrid = [...prev.map(row => [...row])];
            newGrid[randomPos.r][randomPos.c].isHint = true;
            return newGrid;
          });
          setHintCount(prev => prev + 1);
          setLastFoundTime(now); // Reset timer after hint
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFoundTime, hintCount, wordsToFind]);

  const handleMouseDown = (row: number, col: number) => {
    if (grid[row][col].isFound) return;
    setIsDragging(true);
    setSelection([{ row, col }]);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isDragging || grid[row][col].isFound) return;
    
    const start = selection[0];
    if (!start) return;

    // Calculate line
    const dr = row - start.row;
    const dc = col - start.col;
    
    // Only allow straight lines (H, V, or D)
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return;

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const newSelection: {row: number, col: number}[] = [];
    
    const stepR = dr === 0 ? 0 : dr / steps;
    const stepC = dc === 0 ? 0 : dc / steps;

    for (let i = 0; i <= steps; i++) {
      const r = Math.round(start.row + (stepR * i));
      const c = Math.round(start.col + (stepC * i));
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        newSelection.push({ row: r, col: c });
      }
    }
    
    setSelection(newSelection);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const selectedWord = selection.map(s => grid[s.row][s.col].char).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    
    const foundWordIndex = wordsToFind.findIndex(w => !w.found && (w.word === selectedWord || w.word === reversedWord));
    
    if (foundWordIndex !== -1) {
      const newWordsToFind = [...wordsToFind];
      newWordsToFind[foundWordIndex].found = true;
      setWordsToFind(newWordsToFind);
      
      setGrid(prev => {
        const newGrid = [...prev.map(row => [...row])];
        selection.forEach(s => {
          newGrid[s.row][s.col].isFound = true;
          newGrid[s.row][s.col].isHint = false;
        });
        return newGrid;
      });
      setLastFoundTime(Date.now());
    }
    
    setSelection([]);
  };

  const allFound = wordsToFind.length > 0 && wordsToFind.every(w => w.found);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Grid */}
        <div className="p-8 bg-slate-50 flex-1">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Word Search</h2>
            <button onClick={generateGrid} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
              <RefreshCw size={20} />
            </button>
          </div>

          <div 
            className="grid gap-1 bg-slate-200 p-1 rounded-2xl shadow-inner mx-auto w-fit touch-none"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) => (
              row.map((cell, c) => {
                const isSelected = selection.some(s => s.row === r && s.col === c);
                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-black rounded-lg transition-all cursor-pointer select-none",
                      cell.isFound 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : isSelected 
                          ? "bg-indigo-600 text-white" 
                          : cell.isHint
                            ? "bg-amber-100 text-amber-600 animate-pulse border-2 border-amber-400"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {cell.char}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* Right Side: Word List */}
        <div className="p-8 bg-white border-l border-slate-100 w-full md:w-72">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Words to Find</h3>
          <div className="space-y-3">
            {wordsToFind.map((w, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl font-bold transition-all",
                  w.found ? "bg-emerald-50 text-emerald-600 line-through" : "bg-slate-50 text-slate-700"
                )}
              >
                <span>{w.word}</span>
                {w.found && <CheckCircle2 size={16} />}
              </div>
            ))}
          </div>

          {allFound && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-8 p-6 bg-indigo-600 text-white rounded-3xl text-center shadow-xl shadow-indigo-500/20"
            >
              <h4 className="text-xl font-black mb-1">Well Done!</h4>
              <p className="text-sm font-medium opacity-80">You found all the words.</p>
              <button 
                onClick={onClose}
                className="mt-4 w-full py-2 bg-white text-indigo-600 rounded-xl font-black text-sm"
              >
                Close Game
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
