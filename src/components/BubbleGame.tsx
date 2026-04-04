import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Target, Timer, RotateCcw, Zap, Trophy, Play } from 'lucide-react';
import { LessonData } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';

// --- Sound System ---
let audioCtx: AudioContext | null = null;
const playSound = (type: 'pop' | 'shoot' | 'win' | 'lose' | 'click' | 'gameover' | 'start' | 'descend') => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'pop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start();
      osc.stop(now + 0.1);
      break;
    case 'shoot':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start();
      osc.stop(now + 0.1);
      break;
    case 'win':
      [440, 554, 659, 880].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(f, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.3);
      });
      break;
    case 'lose':
    case 'gameover':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1);
      osc.start();
      osc.stop(now + 1);
      break;
    case 'start':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start();
      osc.stop(now + 0.3);
      break;
    case 'descend':
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start();
      osc.stop(now + 0.2);
      break;
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start();
      osc.stop(now + 0.05);
      break;
  }
};

// --- Constants ---
const BUBBLE_RADIUS = 20;
const PROJECTILE_RADIUS = 12; // Visually smaller
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;
const COLORS = ['#FF4D4D', '#4D79FF', '#4DFF88', '#FFD64D', '#D64DFF', '#4DFFFF', '#FF9F4D'];

interface Bubble {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  row: number;
  col: number;
  isFalling?: boolean;
  isBomb?: boolean;
  vy?: number;
  vx?: number;
  scale?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

export default function BubbleGame({ lesson, onComplete, onBack }: { lesson: LessonData, onComplete: () => void, onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showLevelIntro, setShowLevelIntro] = useState(true);
  const [targetWord, setTargetWord] = useState('');
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shootingBubble, setShootingBubble] = useState<{ x: number, y: number, color: string, vx: number, vy: number, char: string, isBomb?: boolean } | null>(null);
  const [aimAngle, setAimAngle] = useState<number | null>(null);
  const [lastDescendTime, setLastDescendTime] = useState(Date.now());
  
  const { currentUser, studentActivity, updateGameProgress, completeActivity } = useAppStore();
  const requestRef = useRef<number>(null);

  const descendRows = useCallback(() => {
    playSound('descend');
    setBubbles(prev => {
      const next = prev.map(b => ({ ...b, y: b.y + BUBBLE_RADIUS * 1.8 }));
      if (next.some(b => !b.isFalling && b.y > CANVAS_HEIGHT - 140)) {
        setIsGameOver(true);
        playSound('gameover');
      }
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    setBubbles(prev => {
      const next = prev.map(b => ({ ...b, y: b.y + BUBBLE_RADIUS * 1.8 }));
      const newRow: Bubble[] = [];
      const cols = 11;
      const r = 0;
      const offset = (r % 2 === 0 ? 0 : BUBBLE_RADIUS);
      for (let c = 0; c < cols; c++) {
        const x = c * BUBBLE_RADIUS * 2.1 + BUBBLE_RADIUS + offset + 20;
        const y = BUBBLE_RADIUS + 20;
        if (x > CANVAS_WIDTH - BUBBLE_RADIUS) continue;
        newRow.push({
          id: `new-${Date.now()}-${c}`,
          x, y,
          color: Math.random() < 0.05 ? '#333' : COLORS[Math.floor(Math.random() * COLORS.length)],
          radius: BUBBLE_RADIUS,
          row: r, col: c,
          isBomb: Math.random() < 0.05,
          scale: 0
        });
      }
      return [...next, ...newRow];
    });
  }, []);

  // Initialize bubbles with animation
  const initBubbles = useCallback(() => {
    const newBubbles: Bubble[] = [];
    const rows = 7;
    const cols = 11;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = (r % 2 === 0 ? 0 : BUBBLE_RADIUS);
        const x = c * BUBBLE_RADIUS * 2.1 + BUBBLE_RADIUS + offset + 20;
        const y = r * BUBBLE_RADIUS * 1.8 + BUBBLE_RADIUS + 20;
        
        if (x > CANVAS_WIDTH - BUBBLE_RADIUS) continue;

        const isBomb = Math.random() < 0.05; // 5% chance of bomb

        newBubbles.push({
          id: `${r}-${c}-${Math.random()}`,
          x,
          y,
          color: isBomb ? '#333' : COLORS[Math.floor(Math.random() * COLORS.length)],
          radius: BUBBLE_RADIUS,
          row: r,
          col: c,
          isBomb,
          scale: 0 // Start small for animation
        });
      }
    }
    setBubbles(newBubbles);
  }, []);

  const startLevel = useCallback((lvl: number) => {
    const vocab = lesson.vocabulary;
    const randomWord = vocab[Math.floor(Math.random() * vocab.length)];
    const word = randomWord.word.toUpperCase();
    setTargetWord(word);
    setCurrentLetterIndex(0);
    setTimeLeft(120);
    setIsGameOver(false);
    setShowLevelIntro(true);
    setLastDescendTime(Date.now());
    initBubbles();
  }, [lesson, initBubbles]);

  useEffect(() => {
    if (currentUser) {
      const progress = studentActivity[currentUser]?.gameProgress?.[lesson.id]?.bubble;
      if (progress) {
        setLevel(progress.level);
        startLevel(progress.level);
      } else {
        startLevel(0);
      }
    }
  }, [currentUser, lesson.id]);

  useEffect(() => {
    if (timeLeft > 0 && !isGameOver && !showLevelIntro) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setIsGameOver(true);
      playSound('lose');
    }
  }, [timeLeft, isGameOver, showLevelIntro]);

  const handleInput = (clientX: number, clientY: number, isEnd = false) => {
    if (isGameOver || showLevelIntro || shootingBubble) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    const shooterX = CANVAS_WIDTH / 2;
    const shooterY = CANVAS_HEIGHT - 60;
    const angle = Math.atan2(y - shooterY, x - shooterX);
    
    if (y < shooterY - 20) {
      setAimAngle(angle);
      if (isEnd) {
        playSound('shoot');
        const isBomb = Math.random() < 0.1; // 10% chance projectile is a bomb
        setShootingBubble({
          x: shooterX,
          y: shooterY,
          color: isBomb ? '#333' : COLORS[currentLetterIndex % COLORS.length],
          vx: Math.cos(angle) * 12,
          vy: Math.sin(angle) * 12,
          char: isBomb ? '💣' : targetWord[currentLetterIndex],
          isBomb
        });
        setAimAngle(null);
      }
    } else {
      setAimAngle(null);
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (isGameOver || showLevelIntro) return;

    const now = Date.now();
    if (now - lastDescendTime > 15000) {
      descendRows();
      setLastDescendTime(now);
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update & Draw Particles
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.2,
      life: p.life - 0.02
    })).filter(p => p.life > 0));

    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Update Bubbles (Intro Animation & Falling)
    setBubbles(prev => prev.map(b => {
      let nextB = { ...b };
      if (nextB.scale !== undefined && nextB.scale < 1) {
        nextB.scale += 0.05;
      }
      if (nextB.isFalling) {
        nextB.y += (nextB.vy || 5);
        nextB.x += (nextB.vx || 0);
        nextB.vy = (nextB.vy || 5) + 0.5;
      }
      return nextB;
    }).filter(b => b.y < CANVAS_HEIGHT + 50));

      // Draw Bubbles
      bubbles.forEach(b => {
        const r = b.radius * (b.scale ?? 1);
        if (r <= 0) return;

        ctx.save();
        ctx.translate(b.x, b.y);
        
        if (b.isBomb) {
          // Draw Bomb
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = '#333';
          ctx.fill();
          
          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', 0, 0);
        } else {
          // Glossy Bubble Effect
          const bubbleGrad = ctx.createRadialGradient(-r/3, -r/3, r/10, 0, 0, r);
          bubbleGrad.addColorStop(0, '#fff');
          bubbleGrad.addColorStop(0.3, b.color);
          bubbleGrad.addColorStop(1, b.color);
          
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = bubbleGrad;
          ctx.fill();
          
          // Highlight
          ctx.beginPath();
          ctx.ellipse(-r/2.5, -r/2.5, r/4, r/6, Math.PI/4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fill();
        }

        ctx.restore();
      });

    // Aiming Line
    if (aimAngle !== null) {
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
      ctx.lineTo(CANVAS_WIDTH / 2 + Math.cos(aimAngle) * 1000, CANVAS_HEIGHT - 60 + Math.sin(aimAngle) * 1000);
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Update Shooting Bubble
    if (shootingBubble) {
      const nextX = shootingBubble.x + shootingBubble.vx;
      const nextY = shootingBubble.y + shootingBubble.vy;
      
      let vx = shootingBubble.vx;
      if (nextX < PROJECTILE_RADIUS || nextX > CANVAS_WIDTH - PROJECTILE_RADIUS) vx *= -1;

      // Collision Check
      let hit = false;
      let hitBubble: Bubble | null = null;
      for (const b of bubbles) {
        if (b.isFalling) continue;
        const dist = Math.sqrt((nextX - b.x) ** 2 + (nextY - b.y) ** 2);
        if (dist < b.radius + PROJECTILE_RADIUS - 2) {
          hit = true;
          hitBubble = b;
          break;
        }
      }

      if (hit && hitBubble) {
        playSound('pop');
        const toExplode: string[] = [];
        const queue = [hitBubble];
        const visited = new Set([hitBubble.id]);
        
        // If projectile is a bomb or hit bubble is a bomb
        if (shootingBubble.isBomb || hitBubble.isBomb) {
          const centerX = hitBubble.x;
          const centerY = hitBubble.y;
          bubbles.forEach(b => {
            const d = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
            if (d < BUBBLE_RADIUS * 5) { // Large explosion radius
              toExplode.push(b.id);
            }
          });
        } else if (hitBubble.color === shootingBubble.color) {
          // Only pop if colors match
          const matchColor = hitBubble.color;
          while (queue.length > 0) {
            const curr = queue.shift()!;
            toExplode.push(curr.id);
            bubbles.forEach(b => {
              if (!visited.has(b.id) && !b.isFalling && b.color === matchColor) {
                const d = Math.sqrt((b.x - curr.x) ** 2 + (b.y - curr.y) ** 2);
                if (d < BUBBLE_RADIUS * 2.3) {
                  visited.add(b.id);
                  queue.push(b);
                }
              }
            });
          }
        }

        if (toExplode.length > 0) {
          playSound('pop');
          // Create Particles
          const newParticles: Particle[] = [];
          bubbles.forEach(b => {
            if (toExplode.includes(b.id)) {
              for (let i = 0; i < 10; i++) {
                newParticles.push({
                  x: b.x, y: b.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: b.color,
                  life: 1,
                  size: Math.random() * 4 + 2
                });
              }
            }
          });
          setParticles(prev => [...prev, ...newParticles]);

          // Remove & Floating Check
          setBubbles(prev => {
            const remaining = prev.filter(b => !toExplode.includes(b.id));
            const connected = new Set<string>();
            const topBubbles = remaining.filter(b => b.y < BUBBLE_RADIUS * 2.5);
            const q = [...topBubbles];
            topBubbles.forEach(b => connected.add(b.id));

            let head = 0;
            while (head < q.length) {
              const curr = q[head++];
              remaining.forEach(b => {
                if (!connected.has(b.id)) {
                  const d = Math.sqrt((b.x - curr.x) ** 2 + (b.y - curr.y) ** 2);
                  if (d < BUBBLE_RADIUS * 2.3) {
                    connected.add(b.id);
                    q.push(b);
                  }
                }
              });
            }

            return remaining.map(b => {
              if (!connected.has(b.id) && !b.isFalling) {
                return { ...b, isFalling: true, vy: 2, vx: (Math.random() - 0.5) * 2 };
              }
              return b;
            });
          });

          if (!shootingBubble.isBomb) {
            setCurrentLetterIndex(prev => prev + 1);
          }
        } else {
          // Missed! Descend rows
          descendRows();
        }
        
        setShootingBubble(null);

        // Check Win
        if (currentLetterIndex + (shootingBubble.isBomb ? 0 : 1) >= targetWord.length) {
          playSound('win');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          if (level === 9) {
            completeActivity(lesson.id, 'bubble');
            setTimeout(onComplete, 2000);
          } else {
            const nextLvl = level + 1;
            updateGameProgress(lesson.id, 'bubble', { level: nextLvl, score: 0 });
            setTimeout(() => {
              setLevel(nextLvl);
              startLevel(nextLvl);
            }, 1500);
          }
        }
      } else if (nextY < 0) {
        // Hit top but didn't pop anything
        descendRows();
        setShootingBubble(null);
      } else if (nextY > CANVAS_HEIGHT || nextX < 0 || nextX > CANVAS_WIDTH) {
        setShootingBubble(null);
      } else {
        setShootingBubble({ ...shootingBubble, x: nextX, y: nextY, vx });
      }
    }

    // Replenish if empty or no matching colors
    if (!showLevelIntro && !isGameOver) {
      const activeBubbles = bubbles.filter(b => !b.isFalling);
      const availableColors = new Set(activeBubbles.map(b => b.color));
      const nextColor = shootingBubble ? shootingBubble.color : COLORS[currentLetterIndex % COLORS.length];
      
      if (activeBubbles.length === 0 || (!availableColors.has(nextColor) && nextColor !== '#333')) {
        addRow();
      }
    }

    // Replenish if empty or no matching colors
    if (!showLevelIntro && !isGameOver) {
      const activeBubbles = bubbles.filter(b => !b.isFalling);
      const availableColors = new Set(activeBubbles.map(b => b.color));
      const nextColor = shootingBubble ? shootingBubble.color : COLORS[currentLetterIndex % COLORS.length];
      
      if (activeBubbles.length === 0 || (!availableColors.has(nextColor) && nextColor !== '#333')) {
        addRow();
      }
    }

    // Draw Shooter
    const shooterX = CANVAS_WIDTH / 2;
    const shooterY = CANVAS_HEIGHT - 60;
    
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(shooterX, shooterY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw Next Bubble
    if (!isGameOver && !showLevelIntro) {
      const nextColor = shootingBubble ? shootingBubble.color : (Math.random() < 0.1 ? '#333' : COLORS[currentLetterIndex % COLORS.length]);
      const nextChar = shootingBubble ? shootingBubble.char : (nextColor === '#333' ? '💣' : targetWord[currentLetterIndex]);
      const bx = shootingBubble ? shootingBubble.x : shooterX;
      const by = shootingBubble ? shootingBubble.y : shooterY;

      const bGrad = ctx.createRadialGradient(bx - PROJECTILE_RADIUS/3, by - PROJECTILE_RADIUS/3, PROJECTILE_RADIUS/10, bx, by, PROJECTILE_RADIUS);
      bGrad.addColorStop(0, '#fff');
      bGrad.addColorStop(0.3, nextColor);
      bGrad.addColorStop(1, nextColor);

      ctx.beginPath();
      ctx.arc(bx, by, PROJECTILE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = bGrad;
      ctx.fill();

      ctx.fillStyle = nextColor === '#333' ? '#ff4d4d' : 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nextChar, bx, by);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [bubbles, shootingBubble, particles, aimAngle, currentLetterIndex, targetWord, level, showLevelIntro, isGameOver, lesson.id, onComplete, completeActivity, startLevel, initBubbles, lastDescendTime, descendRows, addRow]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameLoop]);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 bg-slate-50 overflow-hidden relative font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10">
        <button onClick={() => { playSound('click'); onBack(); }} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Level {level + 1}/10</h2>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-slate-600 font-bold text-sm">
              <Timer size={16} className="text-indigo-600" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Game Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none">
        <div className="relative aspect-[5/6] h-full max-h-[600px] border-8 border-white rounded-[3rem] bg-white shadow-2xl overflow-hidden">
          <canvas 
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain"
            onMouseDown={(e) => handleInput(e.clientX, e.clientY)}
            onMouseMove={(e) => handleInput(e.clientX, e.clientY)}
            onMouseUp={(e) => handleInput(e.clientX, e.clientY, true)}
            onTouchStart={(e) => handleInput(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleInput(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={(e) => handleInput(e.changedTouches[0].clientX, e.changedTouches[0].clientY, true)}
          />

          {/* Level Intro */}
          <AnimatePresence>
            {showLevelIntro && (
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
                    <Trophy size={40} className="text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Level {level + 1}</h2>
                  <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{targetWord}</h3>
                  <button
                    onClick={() => { playSound('click'); setShowLevelIntro(false); }}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={24} fill="currentColor" />
                    Start Play
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 text-center z-[60]"
              >
                <RotateCcw size={64} className="mb-6 text-rose-400" />
                <h3 className="text-4xl font-black mb-2">{timeLeft === 0 ? "Time's Up!" : "Game Over!"}</h3>
                <p className="text-slate-300 mb-8 font-medium text-lg">
                  {timeLeft === 0 ? "You ran out of time." : "The bubbles reached the bottom."} Try again to beat the level!
                </p>
                <button 
                  onClick={() => { playSound('click'); startLevel(level); }}
                  className="px-10 py-5 bg-indigo-600 rounded-[2rem] font-black text-xl hover:bg-indigo-500 transition-colors shadow-xl shadow-indigo-500/40"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Word Progress */}
      <div className="mt-8 flex flex-col items-center gap-6 z-10">
        <div className="flex gap-2 flex-wrap justify-center px-4">
          {targetWord.split('').map((char, i) => (
            <motion.div 
              key={i}
              animate={i === currentLetterIndex ? { scale: [1, 1.1, 1], y: [0, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-12 h-14 rounded-2xl border-4 flex items-center justify-center text-2xl font-black transition-all",
                i < currentLetterIndex 
                  ? 'bg-emerald-500 border-emerald-300 text-white shadow-lg shadow-emerald-500/20' 
                  : i === currentLetterIndex
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white border-slate-200 text-slate-300'
              )}
            >
              {char}
            </motion.div>
          ))}
        </div>
        <div className="px-6 py-3 bg-white rounded-full border-2 border-slate-200 shadow-sm flex items-center gap-3">
          <Target size={20} className="text-indigo-600" />
          <span className="text-slate-900 font-black uppercase tracking-widest text-sm">Target: {targetWord}</span>
        </div>
      </div>
    </div>
  );
}
