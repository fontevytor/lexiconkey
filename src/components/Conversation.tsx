import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Bot, User, Zap, Loader2, Trophy, Clock, Target, Star, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  score?: number;
  feedback?: {
    studentAnswer: string;
    correctAnswer: string;
  };
}

const SOUNDS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3'
};

export default function Conversation({ onBack }: { onBack: () => void }) {
  const { currentUser, userProgress, customLessons, userNotes, studentActivity, updateConversationStats } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<{q: string, a?: string, type: 'assignment' | 'translation'} | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [lastTimeUpdate, setLastTimeUpdate] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const stats = currentUser ? studentActivity[currentUser] : null;
  const currentXP = stats?.conversationXP || 0;
  const currentLevel = stats?.conversationLevel || 1;
  const totalTime = stats?.totalConversationTime || 0;
  const avgScore = stats?.conversationTotalAnswers ? (stats.conversationTotalScore / stats.conversationTotalAnswers) : 0;

  const playSound = (type: keyof typeof SOUNDS) => {
    const audio = new Audio(SOUNDS[type]);
    audio.play().catch(() => {});
  };

  // Session Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update total time periodically
  useEffect(() => {
    const now = Date.now();
    if (now - lastTimeUpdate > 10000) { // Every 10 seconds
      updateConversationStats(0, 10);
      setLastTimeUpdate(now);
    }
  }, [sessionTime, updateConversationStats, lastTimeUpdate]);

  const highlightMatches = (studentAnswer: string, correctAnswer: string) => {
    if (!correctAnswer) return <span>{studentAnswer}</span>;
    
    const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:]/g, '').trim();
    const studentWords = studentAnswer.split(/\s+/);
    const correctWords = correctAnswer.split(/\s+/);
    const normalizedCorrect = correctWords.map(normalize);
    
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Resposta</p>
          <div className="flex flex-wrap gap-1">
            {studentWords.map((word, i) => {
              const norm = normalize(word);
              const isMatch = normalizedCorrect.includes(norm);
              return (
                <span 
                  key={i} 
                  className={cn(
                    "px-1.5 py-0.5 rounded text-sm font-bold",
                    isMatch ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correção</p>
          <div className="flex flex-wrap gap-1">
            {correctWords.map((word, i) => {
              const norm = normalize(word);
              const studentNorms = studentWords.map(normalize);
              const isMissing = !studentNorms.includes(norm);
              return (
                <span 
                  key={i} 
                  className={cn(
                    "px-1.5 py-0.5 rounded text-sm font-bold",
                    isMissing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getNextQuestion = useCallback(() => {
    if (!currentUser) return null;

    // Get unlocked lessons
    const unlockedLessonIds = [1];
    Object.entries(userProgress[currentUser] || {}).forEach(([id, p]) => {
      if (p.unlocked) unlockedLessonIds.push(Number(id));
    });

    // 50% chance for translation, 50% for assignment/QA
    const useTranslation = Math.random() > 0.5;

    if (useTranslation) {
      const availableWords = customLessons
        .filter(l => unlockedLessonIds.includes(l.id))
        .flatMap(l => l.vocabulary);
      
      if (availableWords.length > 0) {
        const word = availableWords[Math.floor(Math.random() * availableWords.length)];
        return { q: `What's the translation of: "${word.word}"?`, a: word.translation, type: 'translation' as const };
      }
    }

    // Get all extra assignments from unlocked lessons
    const lessonQuestions = customLessons
      .filter(l => unlockedLessonIds.includes(l.id))
      .flatMap(l => l.assignments || [])
      .map(a => ({ q: a.question, a: a.answer, type: 'assignment' as const }));

    // Get user Q&A notes
    const userQA = Object.values(userNotes[currentUser] || {})
      .flat()
      .filter(n => n.type === 'qa')
      .map(n => ({ q: n.text, a: n.answer, type: 'assignment' as const }));

    const allQuestions = [...lessonQuestions, ...userQA];
    return allQuestions.length > 0 ? allQuestions[Math.floor(Math.random() * allQuestions.length)] : null;
  }, [currentUser, userProgress, customLessons, userNotes]);

  const startNewConversation = useCallback(() => {
    const randomQuestion = getNextQuestion();

    if (!randomQuestion) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Olá! Você ainda não desbloqueou nenhuma lição ou criou notas de P&R. Continue aprendendo para começar uma conversa!",
        timestamp: Date.now()
      }]);
      return;
    }

    setCurrentQuestion(randomQuestion);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `Olá! Vamos praticar. Eu tenho uma pergunta para você: ${randomQuestion.q}`,
      timestamp: Date.now()
    }]);
  }, [getNextQuestion]);

  useEffect(() => {
    startNewConversation();
  }, [startNewConversation]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const studentInput = input;
    setInput('');
    setIsTyping(true);

    // Simulate "thinking" for a better UX even if local
    setTimeout(async () => {
      const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:]/g, '').trim();
      const expected = normalize(currentQuestion?.a || '');
      const actual = normalize(studentInput);
      
      const expectedWords = (currentQuestion?.a || '').split(/\s+/).map(normalize);
      const actualWords = studentInput.split(/\s+/).map(normalize);
      
      let matches = 0;
      actualWords.forEach(word => {
        if (expectedWords.includes(word)) matches++;
      });

      const score = Math.min(10, (matches / Math.max(expectedWords.length, actualWords.length)) * 10);
      
      let feedbackText = "";
      if (score === 10) feedbackText = "Resposta Correta!";
      else if (score >= 5) feedbackText = "Resposta Parcial.";
      else feedbackText = "Resposta Incorreta.";

      if (score >= 7) {
        playSound('correct');
        await updateConversationStats(10, 0, score);
        if (currentXP + 10 >= 100) playSound('levelUp');
      } else {
        playSound('incorrect');
        await updateConversationStats(2, 0, score);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: feedbackText,
        score: score,
        timestamp: Date.now(),
        feedback: currentQuestion?.a ? {
          studentAnswer: studentInput,
          correctAnswer: currentQuestion.a
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Clear messages after 4 seconds and ask a new question
      setTimeout(() => {
        setMessages([]);
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            const nextQuestion = getNextQuestion();
            if (nextQuestion) {
              setCurrentQuestion(nextQuestion);
              setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `Próxima pergunta: ${nextQuestion.q}`,
                timestamp: Date.now()
              }]);
            }
          }, 1000);
        }, 500);
      }, 4000);
    }, 800);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm overflow-hidden sticky top-0 z-10">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600">
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Bot size={20} className="text-white sm:hidden" />
                  <Bot size={24} className="text-white hidden sm:block" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 tracking-tight text-sm sm:text-base">Lexi AI</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Stats Summary */}
            <div className="flex sm:hidden items-center gap-3">
               <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg</span>
                <span className="text-xs font-bold text-indigo-600">{avgScore.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LVL</span>
                <span className="text-xs font-bold text-slate-700">{currentLevel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
            <div className="flex items-center gap-4 text-slate-500 overflow-x-auto no-scrollbar">
              <div className="flex flex-col items-start sm:items-end min-w-fit">
                <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock size={10} /> Session
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700">{formatTime(sessionTime)}</span>
              </div>
              <div className="w-px h-6 bg-slate-100 hidden sm:block" />
              <div className="flex flex-col items-start sm:items-end min-w-fit">
                <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Trophy size={10} /> Total
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700">{formatTime(totalTime)}</span>
              </div>
              <div className="w-px h-6 bg-slate-100 hidden sm:block" />
              <div className="flex flex-col items-start sm:items-end min-w-fit">
                <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Target size={10} /> Avg Score
                </div>
                <span className="text-xs sm:text-sm font-bold text-indigo-600">{avgScore.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 min-w-fit">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lvl {currentLevel}</span>
                <div className="w-20 sm:w-32 h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${currentXP}%` }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">{currentXP}/100 XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === 'user' ? "bg-slate-200" : "bg-indigo-100"
              )}>
                {msg.role === 'user' ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-indigo-600" />}
              </div>
              <div className={cn(
                "p-4 rounded-3xl font-medium text-sm shadow-sm relative",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
              )}>
                {msg.content}
                
                {msg.score !== undefined && (
                  <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> {msg.score.toFixed(1)}
                  </div>
                )}

                {msg.feedback && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {highlightMatches(msg.feedback.studentAnswer, msg.feedback.correctAnswer)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mr-auto"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={16} className="text-indigo-600" />
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-3xl rounded-tl-none shadow-sm">
                <Loader2 size={16} className="text-indigo-600 animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua resposta..."
            className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:scale-100 active:scale-95"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
