import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Ship, Target, User, Cpu, Trophy, X, Zap, Bomb, Crosshair } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

interface BattleshipProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

type CellState = 'empty' | 'ship' | 'hit' | 'miss';
type WeaponType = 'normal' | 'longShot' | 'megaBomb';

interface GridCell {
  state: CellState;
  char: string;
}

interface Weapon {
  type: WeaponType;
  count: number;
  icon: React.ReactNode;
  label: string;
  desc: string;
}

export default function Battleship({ lesson, onComplete, onBack }: BattleshipProps) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [playerGrid, setPlayerGrid] = useState<GridCell[][]>(Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ state: 'empty', char: '' }))));
  const [aiGrid, setAiGrid] = useState<GridCell[][]>(Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ state: 'empty', char: '' }))));
  const [aiVisibleGrid, setAiVisibleGrid] = useState<CellState[][]>(Array(8).fill(null).map(() => Array(8).fill('empty')));
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [aiMemory, setAiMemory] = useState<{ r: number, c: number } | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('normal');
  const [playerWeapons, setPlayerWeapons] = useState<Record<WeaponType, number>>({ normal: Infinity, longShot: 0, megaBomb: 0 });
  const [aiWeapons, setAiWeapons] = useState<Record<WeaponType, number>>({ normal: Infinity, longShot: 0, megaBomb: 0 });
  const [explosions, setExplosions] = useState<{ r: number, c: number, id: number }[]>([]);
  
  const { completeActivity } = useAppStore();

  const words = lesson.vocabulary.slice(0, 5).map(v => v.word);

  const initWeapons = () => {
    const pWeapons = { normal: Infinity, longShot: 0, megaBomb: 0 };
    const aWeapons = { normal: Infinity, longShot: 0, megaBomb: 0 };
    
    if (Math.random() < 0.2) pWeapons.longShot = 1;
    if (Math.random() < 0.1) pWeapons.megaBomb = 1;
    if (Math.random() < 0.2) aWeapons.longShot = 1;
    if (Math.random() < 0.1) aWeapons.megaBomb = 1;
    
    setPlayerWeapons(pWeapons);
    setAiWeapons(aWeapons);
  };

  useEffect(() => {
    initWeapons();
  }, []);

  const placeShipsRandomly = (grid: GridCell[][]) => {
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, state: 'empty', char: '' })));
    words.forEach(word => {
      let placed = false;
      while (!placed) {
        const isVertical = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (isVertical ? 8 - word.length : 8));
        const c = Math.floor(Math.random() * (isVertical ? 8 : 8 - word.length));
        
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          if (newGrid[isVertical ? r + i : r][isVertical ? c : c + i].state !== 'empty') {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < word.length; i++) {
            newGrid[isVertical ? r + i : r][isVertical ? c : c + i] = { state: 'ship', char: word[i] };
          }
          placed = true;
        }
      }
    });
    return newGrid;
  };

  const startPlaying = () => {
    setAiGrid(placeShipsRandomly(Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ state: 'empty', char: '' })))));
    setGameState('playing');
  };

  const addExplosion = (r: number, c: number) => {
    const id = Math.random();
    setExplosions(prev => [...prev, { r, c, id }]);
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== id));
    }, 1000);
  };

  const handleAttack = (r: number, c: number, type: WeaponType, isPlayer: boolean) => {
    const targetGrid = isPlayer ? aiGrid : playerGrid;
    const visibleGrid = isPlayer ? aiVisibleGrid : null;
    const playerGridCopy = !isPlayer ? playerGrid.map(row => row.map(cell => ({ ...cell }))) : null;
    const aiVisibleCopy = isPlayer ? aiVisibleGrid.map(row => [...row]) : null;

    const targets: { r: number, c: number }[] = [];

    if (type === 'normal') {
      targets.push({ r, c });
    } else if (type === 'longShot') {
      const isVertical = Math.random() > 0.5;
      for (let i = -1; i <= 1; i++) {
        const nr = isVertical ? r + i : r;
        const nc = isVertical ? c : c + i;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) targets.push({ r: nr, c: nc });
      }
    } else if (type === 'megaBomb') {
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const nr = r + i;
          const nc = c + j;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) targets.push({ r: nr, c: nc });
        }
      }
    }

    let hitAny = false;
    targets.forEach(t => {
      const cell = targetGrid[t.r][t.c];
      const hit = cell.state === 'ship' || cell.state === 'hit';
      if (hit) {
        hitAny = true;
        addExplosion(t.r, t.c);
      }
      
      if (isPlayer && aiVisibleCopy) {
        if (aiVisibleCopy[t.r][t.c] === 'empty') {
          aiVisibleCopy[t.r][t.c] = hit ? 'hit' : 'miss';
        }
      } else if (!isPlayer && playerGridCopy) {
        if (playerGridCopy[t.r][t.c].state === 'ship' || playerGridCopy[t.r][t.c].state === 'empty') {
          playerGridCopy[t.r][t.c].state = hit ? 'hit' : 'miss';
        }
      }
    });

    if (isPlayer && aiVisibleCopy) {
      setAiVisibleGrid(aiVisibleCopy);
      const totalShipCells = aiGrid.flat().filter(s => s.state === 'ship').length;
      const totalHits = aiVisibleCopy.flat().filter(s => s === 'hit').length;
      if (totalHits === totalShipCells) {
        setGameState('won');
        confetti({ particleCount: 150, spread: 70 });
        completeActivity(lesson.id, 'battleship');
        setTimeout(onComplete, 3000);
      } else {
        setTurn('ai');
      }
      if (type !== 'normal') {
        setPlayerWeapons(prev => ({ ...prev, [type]: prev[type] - 1 }));
        setSelectedWeapon('normal');
      }
    } else if (!isPlayer && playerGridCopy) {
      setPlayerGrid(playerGridCopy);
      if (hitAny) setAiMemory({ r, c });
      const totalShipCells = playerGrid.flat().filter(s => s.state === 'ship' || s.state === 'hit').length;
      const totalHits = playerGridCopy.flat().filter(s => s.state === 'hit').length;
      if (totalHits === totalShipCells) {
        setGameState('lost');
      } else {
        setTurn('player');
      }
      if (type !== 'normal') {
        setAiWeapons(prev => ({ ...prev, [type]: prev[type] - 1 }));
      }
    }
  };

  useEffect(() => {
    if (turn === 'ai' && gameState === 'playing') {
      setTimeout(aiTurn, 1500);
    }
  }, [turn]);

  const aiTurn = () => {
    let r, c;
    const getAvailableMoves = () => {
      const moves = [];
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (playerGrid[i][j].state !== 'hit' && playerGrid[i][j].state !== 'miss') {
            moves.push({ r: i, c: j });
          }
        }
      }
      return moves;
    };

    const availableMoves = getAvailableMoves();
    if (availableMoves.length === 0) return;

    // AI Weapon Selection
    let weapon: WeaponType = 'normal';
    if (aiWeapons.megaBomb > 0 && Math.random() < 0.3) weapon = 'megaBomb';
    else if (aiWeapons.longShot > 0 && Math.random() < 0.4) weapon = 'longShot';

    if (aiMemory) {
      const neighbors = [
        { r: aiMemory.r - 1, c: aiMemory.c },
        { r: aiMemory.r + 1, c: aiMemory.c },
        { r: aiMemory.r, c: aiMemory.c - 1 },
        { r: aiMemory.r, c: aiMemory.c + 1 },
      ].filter(n => 
        n.r >= 0 && n.r < 8 && n.c >= 0 && n.c < 8 && 
        playerGrid[n.r][n.c].state !== 'hit' && playerGrid[n.r][n.c].state !== 'miss'
      );
      
      if (neighbors.length > 0) {
        const target = neighbors[Math.floor(Math.random() * neighbors.length)];
        r = target.r;
        c = target.c;
      } else {
        setAiMemory(null);
        const move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        r = move.r;
        c = move.c;
      }
    } else {
      const move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      r = move.r;
      c = move.c;
    }

    handleAttack(r, c, weapon, false);
  };

  const weapons: Weapon[] = [
    { type: 'normal', count: Infinity, icon: <Crosshair size={20} />, label: 'Standard', desc: 'Single target' },
    { type: 'longShot', count: playerWeapons.longShot, icon: <Zap size={20} />, label: 'Long Shot', desc: 'Hits 3 in a line' },
    { type: 'megaBomb', count: playerWeapons.megaBomb, icon: <Bomb size={20} />, label: 'Mega Bomb', desc: 'Hits 2x2 area' },
  ];

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-600 shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Battleship <span className="text-indigo-600">Tactics</span></h2>
        <div className="w-12" />
      </div>

      {gameState === 'setup' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h3 className="text-3xl font-black text-indigo-600 mb-2 tracking-tight">Prepare for Battle</h3>
            <p className="text-slate-500 font-medium">Place your 5 words on the grid</p>
          </div>
          <div className="grid grid-cols-8 gap-1.5 p-4 bg-white border-4 border-slate-100 rounded-[2.5rem] shadow-2xl">
            {playerGrid.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`} className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all ${cell.state === 'ship' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 text-slate-200'}`}>
                {cell.char}
              </div>
            )))}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setPlayerGrid(placeShipsRandomly(Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ state: 'empty', char: '' })))))}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-100 rounded-2xl font-black transition-all shadow-sm"
            >
              Randomize
            </button>
            <button 
              onClick={startPlaying}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/25 transition-all"
            >
              Start Game
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col xl:flex-row gap-12 items-start justify-center">
          {/* Player Grid */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-2 bg-indigo-100 text-indigo-600 rounded-full font-black uppercase tracking-widest text-[10px]">
              <User size={14} /> YOUR FLEET
            </div>
            <div className="grid grid-cols-8 gap-1.5 p-4 bg-white border-4 border-slate-100 rounded-[2.5rem] shadow-2xl">
              {playerGrid.map((row, r) => row.map((cell, c) => (
                <div key={`${r}-${c}`} className="relative">
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                    cell.state === 'hit' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 
                    cell.state === 'miss' ? 'bg-slate-200 text-slate-400' : 
                    cell.state === 'ship' ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100' : 
                    'bg-slate-50'
                  }`}>
                    {cell.state === 'hit' ? cell.char : cell.state === 'miss' ? '•' : cell.char}
                  </div>
                  <AnimatePresence>
                    {explosions.some(e => e.r === r && e.c === c) && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-orange-500 rounded-full z-10 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                </div>
              )))}
            </div>
          </div>

          {/* Weapon Selection */}
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Special Weapons</h3>
            <div className="grid grid-cols-1 gap-3">
              {weapons.map(w => (
                <button
                  key={w.type}
                  disabled={w.count === 0 || turn !== 'player'}
                  onClick={() => setSelectedWeapon(w.type)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-3xl border-2 transition-all text-left",
                    selectedWeapon === w.type 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20" 
                      : w.count === 0 
                        ? "bg-slate-100 border-transparent opacity-40 grayscale"
                        : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl",
                    selectedWeapon === w.type ? "bg-white/20" : "bg-slate-50"
                  )}>
                    {w.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm">{w.label}</span>
                      <span className="text-[10px] font-black opacity-60">
                        {w.count === Infinity ? '∞' : `x${w.count}`}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-60 font-medium">{w.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Grid (Target) */}
          <div className="flex flex-col items-center gap-6">
            <div className={`flex items-center gap-3 px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] transition-all ${turn === 'player' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Cpu size={14} /> ENEMY WATERS {turn === 'player' && "• YOUR TURN"}
            </div>
            <div className={`grid grid-cols-8 gap-1.5 p-4 bg-white border-4 rounded-[2.5rem] transition-all shadow-2xl ${turn === 'player' ? 'border-emerald-500/30 ring-8 ring-emerald-500/5' : 'border-slate-100'}`}>
              {aiVisibleGrid.map((row, r) => row.map((cell, c) => (
                <div key={`${r}-${c}`} className="relative">
                  <button 
                    disabled={turn !== 'player' || cell !== 'empty' || gameState !== 'playing'}
                    onClick={() => handleAttack(r, c, selectedWeapon, true)}
                    className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                      cell === 'hit' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                      cell === 'miss' ? 'bg-slate-200 text-slate-400' : 
                      'bg-slate-50 hover:bg-slate-100 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {cell === 'hit' ? aiGrid[r][c].char : cell === 'miss' ? '•' : ''}
                  </button>
                  <AnimatePresence>
                    {explosions.some(e => e.r === r && e.c === c) && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-orange-500 rounded-full z-10 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                </div>
              )))}
            </div>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[3rem] border-4 border-emerald-100 text-center shadow-2xl">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy size={48} />
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Victory!</h2>
            <p className="text-slate-500 font-medium mb-10 text-lg">You destroyed the enemy fleet.</p>
            <button 
              onClick={onComplete}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-500/25 transition-all"
            >
              Continue
            </button>
          </motion.div>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[3rem] border-4 border-red-100 text-center shadow-2xl">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <X size={48} />
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Defeat</h2>
            <p className="text-slate-500 font-medium mb-10 text-lg">Your fleet has been sunk.</p>
            <button 
              onClick={() => {
                setGameState('setup');
                setPlayerGrid(Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ state: 'empty', char: '' }))));
                setAiVisibleGrid(Array(8).fill(null).map(() => Array(8).fill('empty')));
                initWeapons();
              }}
              className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-[2rem] font-black shadow-xl shadow-red-500/25 transition-all"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
