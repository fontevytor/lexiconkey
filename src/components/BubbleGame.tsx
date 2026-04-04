import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Target, Timer, RotateCcw, Zap, AlertCircle, Trophy } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

interface BubbleGameProps {
  lesson: LessonData;
  onComplete: () => void;
  onBack: () => void;
}

interface Point { x: number; y: number; }
interface Bubble {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  row: number;
  col: number;
  isBomb?: boolean;
  isFalling?: boolean;
  vy?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const BUBBLE_RADIUS = 18;
const PROJECTILE_RADIUS = 12;
const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const COLOR_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];

interface Bubble {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  row: number;
  col: number;
  isBomb?: boolean;
  isAddRow?: boolean;
  isLightning?: boolean;
  isFalling?: boolean;
  vy?: number;
}

export default function BubbleGame({ lesson, onComplete, onBack }: BubbleGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGameOver, setIsGameOver] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [powerUpIndex, setPowerUpIndex] = useState<number | null>(null);
  
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shootingBubble, setShootingBubble] = useState<{ x: number, y: number, color: string, char: string, vx: number, vy: number, isPowerUp?: boolean, radius: number } | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  
  const [shake, setShake] = useState(0);
  const [showLevelIntro, setShowLevelIntro] = useState(true);
  const [lastLevelScore, setLastLevelScore] = useState(0);
  const [showNewRowAnim, setShowNewRowAnim] = useState(false);
  
  const { currentUser, studentActivity, updateGameProgress, completeActivity } = useAppStore();
  const requestRef = useRef<number>(null);

  const initLevel = useCallback((lvl: number) => {
    const word = lesson.vocabulary[lvl % lesson.vocabulary.length].word.toUpperCase();
    setTargetWord(word);
    setCurrentLetterIndex(0);
    setTimeLeft(120);
    setIsGameOver(false);
    setCooldown(0);
    setShootingBubble(null);
    setParticles([]);
    setShowLevelIntro(true);
    setPowerUpIndex(Math.random() < 0.3 ? Math.floor(Math.random() * word.length) : null);

    const newBubbles: Bubble[] = [];
    const rows = 8;
    const cols = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = (r % 2 === 0 ? 0 : BUBBLE_RADIUS);
        const x = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset;
        const y = r * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS;
        
        if (x > 500 - BUBBLE_RADIUS) continue;

        const rand = Math.random();
        const isBomb = rand < 0.04;
        const isAddRow = !isBomb && rand < 0.06;
        const isLightning = !isBomb && !isAddRow && rand < 0.08;

        newBubbles.push({
          id: `${r}-${c}`,
          x,
          y,
          color: isBomb ? '#334155' : isAddRow ? '#000000' : isLightning ? '#fbbf24' : COLORS[Math.floor(Math.random() * COLORS.length)],
          radius: BUBBLE_RADIUS,
          row: r,
          col: c,
          isBomb,
          isAddRow,
          isLightning
        });
      }
    }
    setBubbles(newBubbles);
  }, [lesson]);

  useEffect(() => {
    // Load progress
    if (currentUser) {
      const progress = studentActivity[currentUser]?.gameProgress?.[lesson.id]?.bubble;
      if (progress) {
        setLevel(progress.level);
        setScore(progress.score);
        initLevel(progress.level);
      } else {
        initLevel(0);
      }
    }
  }, [currentUser, lesson.id, studentActivity]);

  useEffect(() => {
    if (timeLeft > 0 && !isGameOver) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setIsGameOver(true);
    }
  }, [timeLeft, isGameOver]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isGameOver || cooldown > 0 || shootingBubble) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 60;
    const dist = Math.sqrt((x - shooterX) ** 2 + (y - shooterY) ** 2);
    
    // Increase hit area for starting drag
    if (dist < 100) {
      setDragStart({ x: shooterX, y: shooterY });
      setDragCurrent({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    setDragCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!dragStart || !dragCurrent) return;
    
    // Calculate direction: from shooter to current drag position
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 30) {
      const speed = 12; // Constant speed for better predictability
      const angle = Math.atan2(dy, dx);
      
      // Only shoot upwards
      if (dy < 0) {
        setShootingBubble({
          x: dragStart.x,
          y: dragStart.y,
          color: COLORS[currentLetterIndex % COLORS.length],
          char: targetWord[currentLetterIndex],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          isPowerUp: currentLetterIndex === powerUpIndex,
          radius: PROJECTILE_RADIUS
        });
      }
    }
    
    setDragStart(null);
    setDragCurrent(null);
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (shake > 0) {
      const sx = (Math.random() - 0.5) * shake;
      const sy = (Math.random() - 0.5) * shake;
      ctx.translate(sx, sy);
      setShake(s => Math.max(0, s - 0.5));
    }

    // Draw Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#f8fafc');
    bgGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background grid/guide
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Update Particles
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.02
    })).filter(p => p.life > 0));

    // Draw Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Update Falling Bubbles
    setBubbles(prev => prev.map(b => {
      if (b.isFalling) {
        return { ...b, y: b.y + (b.vy || 2), vy: (b.vy || 2) + 0.5 };
      }
      return b;
    }).filter(b => b.y < canvas.height + BUBBLE_RADIUS));

    // Draw Bubbles
    bubbles.forEach(b => {
      const gradient = ctx.createRadialGradient(b.x - b.radius/3, b.y - b.radius/3, b.radius/10, b.x, b.y, b.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, b.color);
      gradient.addColorStop(1, b.color);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Subtle border
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (b.isBomb) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', b.x, b.y);
      } else if (b.isAddRow) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('➕', b.x, b.y);
      } else if (b.isLightning) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', b.x, b.y);
      }
    });

    // Draw Trajectory
    if (dragStart && dragCurrent) {
      const dx = dragCurrent.x - dragStart.x;
      const dy = dragCurrent.y - dragStart.y;
      const angle = Math.atan2(dy, dx);
      const speed = 12;
      
      if (dy < 0) {
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = currentLetterIndex === powerUpIndex ? 'rgba(234, 179, 8, 0.6)' : 'rgba(79, 70, 229, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        
        // Draw dots instead of a solid line for a "smoother" look
        let tx = dragStart.x;
        let ty = dragStart.y;
        let tvx = Math.cos(angle) * speed;
        let tvy = Math.sin(angle) * speed;
        for (let i = 0; i < 60; i++) {
          tx += tvx;
          ty += tvy;
          if (tx < BUBBLE_RADIUS || tx > canvas.width - BUBBLE_RADIUS) tvx *= -1;
          
          if (i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(tx, ty, 2, 0, Math.PI * 2);
            ctx.fillStyle = currentLetterIndex === powerUpIndex ? 'rgba(234, 179, 8, 0.4)' : 'rgba(79, 70, 229, 0.3)';
            ctx.fill();
          }
          
          if (ty < 0) break;
        }
        ctx.setLineDash([]);
      }
    }

    // Update Shooting Bubble
    if (shootingBubble) {
      const nextX = shootingBubble.x + shootingBubble.vx;
      const nextY = shootingBubble.y + shootingBubble.vy;
      
      let newVx = shootingBubble.vx;
      if (nextX < shootingBubble.radius || nextX > canvas.width - shootingBubble.radius) newVx *= -1;

      // Check collision with bubbles
      let hit = false;
      let hitBubble: Bubble | null = null;
      for (const b of bubbles) {
        if (b.isFalling) continue;
        const dist = Math.sqrt((nextX - b.x) ** 2 + (nextY - b.y) ** 2);
        if (dist < b.radius + shootingBubble.radius) {
          hit = true;
          hitBubble = b;
          break;
        }
      }

      if (hit && hitBubble) {
        const toExplode: string[] = [];
        
        if (shootingBubble.isPowerUp) {
          // Power up: destroy whole row
          const rowToDestroy = hitBubble.row;
          bubbles.forEach(b => {
            if (b.row === rowToDestroy) toExplode.push(b.id);
          });
          setScore(s => s + toExplode.length * 50);
        } else if (hitBubble.isBomb) {
          // Bomb: destroy area
          setShake(10);
          const radius = BUBBLE_RADIUS * 6;
          bubbles.forEach(b => {
            const d = Math.sqrt((b.x - hitBubble!.x) ** 2 + (b.y - hitBubble!.y) ** 2);
            if (d < radius) toExplode.push(b.id);
          });
          setScore(s => s + toExplode.length * 50);
        } else if (hitBubble.isLightning) {
          // Lightning: destroy 5 random bubbles
          setShake(8);
          const randomIndices = Array.from({ length: Math.min(5, bubbles.length) }, () => Math.floor(Math.random() * bubbles.length));
          randomIndices.forEach(idx => toExplode.push(bubbles[idx].id));
          setScore(s => s + toExplode.length * 75);
        } else if (hitBubble.color === shootingBubble.color) {
          // Connected same color logic
          const connected: string[] = [];
          const queue = [hitBubble];
          const visited = new Set([hitBubble.id]);
          
          while (queue.length > 0) {
            const current = queue.shift()!;
            connected.push(current.id);
            
            bubbles.forEach(b => {
              if (!visited.has(b.id) && b.color === hitBubble!.color) {
                const d = Math.sqrt((b.x - current.x) ** 2 + (b.y - current.y) ** 2);
                if (d < BUBBLE_RADIUS * 2.2) {
                  visited.add(b.id);
                  queue.push(b);
                }
              }
            });
          }
          
          if (connected.length >= 1) {
            toExplode.push(...connected);
            setScore(s => s + connected.length * 100);
          }
        }

        if (toExplode.length > 0) {
          // Create particles for each exploded bubble
          const newParticles: Particle[] = [];
          bubbles.forEach(b => {
            if (toExplode.includes(b.id)) {
              for (let i = 0; i < 8; i++) {
                newParticles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  color: b.color,
                  life: 1
                });
              }
            }
          });
          setParticles(prev => [...prev, ...newParticles]);
          
          // Check for floating bubbles
          setBubbles(prev => {
            const remaining = prev.filter(b => !toExplode.includes(b.id));
            const connectedToTop = new Set<string>();
            const queue: Bubble[] = remaining.filter(b => b.y < BUBBLE_RADIUS * 2);
            
            queue.forEach(b => connectedToTop.add(b.id));
            
            let head = 0;
            while (head < queue.length) {
              const current = queue[head++];
              remaining.forEach(b => {
                if (!connectedToTop.has(b.id)) {
                  const d = Math.sqrt((b.x - current.x) ** 2 + (b.y - current.y) ** 2);
                  if (d < BUBBLE_RADIUS * 2.2) {
                    connectedToTop.add(b.id);
                    queue.push(b);
                  }
                }
              });
            }
            
            return remaining.map(b => {
              if (!connectedToTop.has(b.id) && !b.isFalling) {
                return { ...b, isFalling: true, vy: Math.random() * 2 };
              }
              return b;
            });
          });

          setCurrentLetterIndex(prev => prev + 1);
          
          if (currentLetterIndex + 1 >= targetWord.length) {
            if (level === 9) {
              confetti({ particleCount: 150, spread: 70 });
              completeActivity(lesson.id, 'bubble');
              setTimeout(onComplete, 2000);
            } else {
              const nextLevel = level + 1;
              updateGameProgress(lesson.id, 'bubble', { level: nextLevel, score: score + toExplode.length * 100 });
              setLevel(nextLevel);
              initLevel(nextLevel);
            }
          }
        } else {
          // Missed color - add 2 rows
          setShowNewRowAnim(true);
          setTimeout(() => setShowNewRowAnim(false), 1000);
          setShake(5);
          
          setBubbles(prev => {
            const shifted = prev.map(b => ({ ...b, y: b.y + BUBBLE_RADIUS * 1.7 * 2, row: b.row + 2 }));
            const newRows: Bubble[] = [];
            const cols = 14;
            
            for (let r = 0; r < 2; r++) {
              for (let c = 0; c < cols; c++) {
                const offset = ((prev.length + r) % 2 === 0 ? 0 : BUBBLE_RADIUS);
                const x = c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset;
                if (x > 500 - BUBBLE_RADIUS) continue;

                const isBomb = Math.random() < 0.05;
                newRows.push({
                  id: `new-${Date.now()}-${r}-${c}`,
                  x,
                  y: BUBBLE_RADIUS + (r * BUBBLE_RADIUS * 1.7),
                  color: isBomb ? '#334155' : COLORS[Math.floor(Math.random() * COLORS.length)],
                  radius: BUBBLE_RADIUS,
                  row: r,
                  col: c,
                  isBomb
                });
              }
            }
            const combined = [...shifted, ...newRows];
            if (combined.some(b => !b.isFalling && b.y > canvas.height - 150)) {
              setIsGameOver(true);
            }
            return combined;
          });
        }
        setShootingBubble(null);
      } else if (nextY < 0) {
        // Hit top wall without hitting bubble
        setShootingBubble(null);
        setCooldown(10); // Reduced cooldown
      } else if (nextY > canvas.height) {
        setShootingBubble(null);
      } else {
        setShootingBubble({ ...shootingBubble, x: nextX, y: nextY, vx: newVx });
      }
    }

    // Draw Shooter Base
    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 60;
    ctx.beginPath();
    ctx.arc(shooterX, shooterY, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Shooting Bubble
    const drawX = shootingBubble ? shootingBubble.x : shooterX;
    const drawY = shootingBubble ? shootingBubble.y : shooterY;
    const drawColor = shootingBubble ? shootingBubble.color : COLORS[currentLetterIndex % COLORS.length];
    const drawChar = shootingBubble ? shootingBubble.char : targetWord[currentLetterIndex];

    if (!isGameOver) {
      // Outer glow for shooting bubble
      if (!shootingBubble) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = drawColor;
      }

      const gradient = ctx.createRadialGradient(drawX - BUBBLE_RADIUS/3, drawY - BUBBLE_RADIUS/3, BUBBLE_RADIUS/10, drawX, drawY, BUBBLE_RADIUS);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.2, drawColor);
      gradient.addColorStop(1, drawColor);

      ctx.beginPath();
      ctx.arc(drawX, drawY, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = cooldown > 0 ? '#cbd5e1' : gradient;
      ctx.fill();
      
      ctx.shadowBlur = 0; // Reset shadow

      if (currentLetterIndex === powerUpIndex && !shootingBubble) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Pulsing outer ring
        const pulse = Math.sin(Date.now() / 200) * 3 + 5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, BUBBLE_RADIUS + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(drawChar || '', drawX, drawY);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [bubbles, shootingBubble, dragStart, dragCurrent, currentLetterIndex, targetWord, level, lesson.id, onComplete, completeActivity, initLevel, cooldown, isGameOver, particles, powerUpIndex]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameLoop]);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 bg-slate-50 overflow-hidden relative">
      <div className="flex justify-between items-center mb-4 md:mb-8 z-10">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Level {level + 1}/10</h2>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-slate-600 font-bold text-sm md:text-base">
              <Timer size={16} className="text-indigo-600" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-1 text-slate-600 font-bold text-sm md:text-base">
              <Zap size={16} className="text-amber-500" />
              {score}
            </div>
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className={cn(
        "flex-1 relative flex items-center justify-center overflow-hidden touch-none",
        shake > 0 && "animate-shake"
      )}>
        <div className="relative aspect-[5/6] h-full max-h-[600px] border-4 border-white rounded-[2rem] md:rounded-[3rem] bg-white shadow-2xl overflow-hidden">
          <canvas 
            ref={canvasRef}
            width={500}
            height={600}
            className="w-full h-full object-contain"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />

          <AnimatePresence>
            {showNewRowAnim && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
              >
                <div className="bg-rose-500/20 backdrop-blur-sm w-full h-full flex items-center justify-center">
                  <motion.h2 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-6xl font-black text-rose-600 drop-shadow-lg"
                  >
                    NEW ROWS!
                  </motion.h2>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        <AnimatePresence>
          {showLevelIntro && !isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[3rem] p-10 text-center max-w-sm w-full shadow-2xl"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Target size={40} className="text-indigo-600" />
                </div>
                <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Level {level + 1}</h2>
                <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{targetWord}</h3>
                <p className="text-slate-500 font-medium mb-8">
                  {level > 0 ? `Last Level Score: ${lastLevelScore}` : "Clear the bubbles to spell the word!"}
                </p>
                <button
                  onClick={() => setShowLevelIntro(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Let's Go!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 text-center"
            >
              <RotateCcw size={64} className="mb-6 text-indigo-400" />
              <h3 className="text-4xl font-black mb-2">Game Over!</h3>
              <p className="text-slate-300 mb-8 font-medium">The bubbles reached the bottom or time ran out.</p>
              <button 
                onClick={() => initLevel(level)}
                className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-colors shadow-xl shadow-indigo-500/40"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {cooldown > 0 && !isGameOver && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-lg flex items-center gap-2">
            <Timer size={16} className="text-rose-500 animate-pulse" />
            <span className="text-slate-900 font-black text-sm">Cooldown: {cooldown}s</span>
          </div>
        )}
        </div>
      </div>

      <div className="mt-6 md:mt-10 flex flex-col items-center gap-4 md:gap-6 z-10">
        <div className="flex gap-2 flex-wrap justify-center px-4">
          {targetWord.split('').map((char, i) => (
            <motion.button 
              key={i}
              onClick={() => i >= currentLetterIndex && setCurrentLetterIndex(i)}
              animate={i === currentLetterIndex ? { scale: [1, 1.1, 1], y: [0, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-10 h-12 md:w-12 md:h-14 rounded-xl border-2 flex flex-col items-center justify-center text-xl md:text-2xl font-black transition-all relative",
                i < currentLetterIndex 
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                  : i === currentLetterIndex
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white border-slate-200 text-slate-300 hover:border-indigo-300'
              )}
            >
              {char}
              {i === powerUpIndex && i >= currentLetterIndex && (
                <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-full shadow-lg">
                  <Zap size={10} fill="white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
        <p className="text-slate-900 font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 bg-white px-4 md:px-6 py-2 rounded-full border border-slate-200 shadow-sm">
          <Target size={16} className="text-indigo-600" />
          Word: <span className="text-indigo-600">{targetWord}</span>
        </p>
      </div>
    </div>
  );
}
