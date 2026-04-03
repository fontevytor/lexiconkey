/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Gamepad2, 
  Trophy, 
  Lock, 
  Star, 
  ChevronLeft, 
  Brain,
  Zap,
  Target,
  Music,
  Ship,
  X,
  Save,
  CheckCircle2,
  User,
  ShieldCheck
} from 'lucide-react';
import { LESSONS, LessonData } from './data/lessons';
import { useAppStore } from './store/useAppStore';
import { cn } from './lib/utils';
import Flashcards from './components/Flashcards';
import BubbleGame from './components/BubbleGame';
import Hangman from './components/Hangman';
import Battleship from './components/Battleship';
import PianoFail from './components/PianoFail';
import GeneralKnowledge from './components/GeneralKnowledge';
import TeacherDashboard from './components/TeacherDashboard';

type View = 'landing' | 'home' | 'lesson-detail' | 'activity' | 'general-knowledge' | 'teacher';
type ActivityType = 'flashcards' | 'bubble' | 'hangman' | 'battleship' | 'piano';

export default function App() {
  const { 
    isLessonUnlocked, 
    getStarsCount, 
    lastSaved, 
    saveProgress, 
    userType, 
    setUserType,
    currentUser,
    setCurrentUser,
    studentAccounts,
    userProgress,
    customLessons 
  } = useAppStore();

  const [view, setView] = useState<View>('landing');
  const [selectedLesson, setSelectedLesson] = useState<LessonData | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [loginMode, setLoginMode] = useState<'student' | 'teacher' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (loginMode === 'teacher') {
      if (username === 'teacher' && password === 'adminadminadmin123') {
        setUserType('teacher');
        setCurrentUser('teacher');
        setView('teacher');
        setError('');
      } else {
        setError('Invalid teacher credentials');
      }
    } else if (loginMode === 'student') {
      const student = studentAccounts.find(s => s.username === username && s.password === password);
      if (student) {
        setUserType('student');
        setCurrentUser(username);
        setView('home');
        setError('');
      } else {
        setError('Invalid student credentials');
      }
    }
  };

  const handleLogout = () => {
    setUserType(null);
    setCurrentUser(null);
    setView('landing');
    setLoginMode(null);
    setUsername('');
    setPassword('');
  };

  const handleSave = () => {
    saveProgress();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleLessonSelect = (lesson: LessonData) => {
    if (isLessonUnlocked(lesson.id)) {
      setSelectedLesson(lesson);
      setView('lesson-detail');
    }
  };

  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setView('activity');
  };

  const handleTeacherAccess = () => {
    if (password === 'adminadminadmin123') {
      setUserType('teacher');
      setView('teacher');
      setPassword('');
      setError('');
    } else {
      setError('Incorrect Password');
      setTimeout(() => setError(''), 2000);
    }
  };

  const renderActivity = () => {
    if (!selectedLesson || !selectedActivity) return null;

    const props = {
      lesson: selectedLesson,
      onComplete: () => setView('lesson-detail'),
      onBack: () => setView('lesson-detail'),
    };

    switch (selectedActivity) {
      case 'flashcards': return <Flashcards {...props} />;
      case 'bubble': return <BubbleGame {...props} />;
      case 'hangman': return <Hangman {...props} />;
      case 'battleship': return <Battleship {...props} />;
      case 'piano': return <PianoFail {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-md bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl"
            >
              <div className="text-center mb-12">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Brain size={48} className="text-white" />
                </div>
                <h1 className="text-6xl font-black tracking-tighter mb-2">Lexicon</h1>
                <p className="text-indigo-100 text-lg font-medium">Master English through play</p>
              </div>

              {!loginMode ? (
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => setLoginMode('student')}
                    className="px-12 py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <User size={24} /> Student Mode
                  </button>
                  <button
                    onClick={() => setLoginMode('teacher')}
                    className="px-12 py-5 bg-indigo-500/30 hover:bg-indigo-500/40 text-white border border-white/20 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={24} /> Teacher Mode
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <button 
                      onClick={() => { setLoginMode(null); setError(''); }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-black">
                      {loginMode === 'teacher' ? 'Teacher Login' : 'Student Login'}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2 ml-1">Username</label>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-6 py-4 bg-white/10 border border-white/20 focus:border-white rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/30"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2 ml-1">Password</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-6 py-4 bg-white/10 border border-white/20 focus:border-white rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/30"
                        placeholder="Enter password"
                      />
                    </div>
                    
                    {error && (
                      <p className="text-red-300 text-sm font-bold text-center bg-red-500/20 py-2 rounded-xl border border-red-500/30">{error}</p>
                    )}

                    <button 
                      onClick={handleLogin}
                      className="w-full py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all mt-4"
                    >
                      Login
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {view === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto p-6 pt-12"
          >
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-6xl font-black tracking-tighter text-slate-900">
                    Lexicon<span className="text-indigo-600">.</span>
                  </h1>
                  <span className="px-4 py-1.5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
                    Student: {currentUser}
                  </span>
                </div>
                <p className="text-slate-700 text-lg font-medium">Master your vocabulary through play.</p>
                <div className="flex items-center gap-2 mt-4 text-slate-500 text-sm font-bold">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Auto-save active • Last saved: {new Date(lastSaved).toLocaleTimeString()}
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleLogout}
                  className="px-6 py-4 bg-white border-2 border-slate-200 rounded-[2rem] hover:border-rose-500 hover:text-rose-600 transition-all font-black text-slate-800 shadow-sm"
                >
                  Logout
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-slate-200 rounded-[2rem] hover:border-indigo-500 transition-all font-black text-slate-800 shadow-sm hover:shadow-md group"
                >
                  <Save size={24} className={cn("text-slate-600 group-hover:text-indigo-600 transition-colors", showSaved && "text-emerald-500")} />
                  {showSaved ? 'Saved!' : 'Save Progress'}
                </button>
                <button 
                  onClick={() => setView('general-knowledge')}
                  className="flex items-center gap-3 px-8 py-4 bg-indigo-600 rounded-[2rem] hover:bg-indigo-700 transition-all font-black text-white shadow-xl shadow-indigo-500/20 group"
                >
                  <Brain size={24} className="text-white group-hover:scale-110 transition-transform" />
                  General Knowledge
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {customLessons.map((lesson, index) => {
                const unlocked = isLessonUnlocked(lesson.id);
                const stars = getStarsCount(lesson.id);
                
                return (
                  <motion.button
                    key={lesson.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={unlocked ? { y: -4, scale: 1.02 } : {}}
                    whileTap={unlocked ? { scale: 0.98 } : {}}
                    onClick={() => handleLessonSelect(lesson)}
                    className={cn(
                      "relative p-8 rounded-[2.5rem] border-2 text-left transition-all overflow-hidden shadow-sm",
                      unlocked 
                        ? "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xl cursor-pointer" 
                        : "bg-slate-100 border-transparent opacity-60 grayscale cursor-not-allowed"
                    )}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-[2px] z-10">
                        <Lock className="text-slate-600" size={32} />
                      </div>
                    )}
                    
                    <div className="relative z-0">
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-4xl font-black text-slate-300 group-hover:text-indigo-100 transition-colors">
                          {String(lesson.id).padStart(2, '0')}
                        </span>
                        {unlocked && (
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={cn(
                                  "transition-colors",
                                  i < stars ? "fill-amber-400 text-amber-400" : "text-slate-300"
                                )} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
                        {lesson.title}
                      </h3>
                      <p className="text-slate-600 font-medium text-sm">
                        {lesson.vocabulary.length} words to master
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {view === 'teacher' && (
          <TeacherDashboard onBack={() => setView('landing')} />
        )}

        {view === 'lesson-detail' && selectedLesson && (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto p-6 pt-12"
          >
            <div className="flex justify-between items-center mb-10">
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-bold group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Lessons
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-bold"
              >
                <Save size={18} className={cn(showSaved && "text-emerald-500")} />
                {showSaved ? 'Saved!' : 'Save Progress'}
              </button>
            </div>

            <div className="mb-12">
              <h2 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">{selectedLesson.title}</h2>
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={28} 
                    className={i < getStarsCount(selectedLesson.id) ? "fill-amber-400 text-amber-400" : "text-slate-300"} 
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActivityCard 
                title="Flashcards" 
                desc="Practice vocabulary with flips" 
                icon={<BookOpen className="text-rose-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.flashcards : false}
                onClick={() => handleActivitySelect('flashcards')}
                color="bg-rose-50"
              />
              <ActivityCard 
                title="Bubble Shooter" 
                desc="Shoot letters to form words" 
                icon={<Target className="text-sky-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.bubble : false}
                onClick={() => handleActivitySelect('bubble')}
                color="bg-sky-50"
              />
              <ActivityCard 
                title="Hangman" 
                desc="Guess the word before it's too late" 
                icon={<Gamepad2 className="text-emerald-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.hangman : false}
                onClick={() => handleActivitySelect('hangman')}
                color="bg-emerald-50"
              />
              <ActivityCard 
                title="Battleship" 
                desc="Strategic word combat" 
                icon={<Ship className="text-indigo-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.battleship : false}
                onClick={() => handleActivitySelect('battleship')}
                color="bg-indigo-50"
              />
              <ActivityCard 
                title="Piano Fail" 
                desc="Musical phrase reconstruction" 
                icon={<Music className="text-violet-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.piano : false}
                onClick={() => handleActivitySelect('piano')}
                color="bg-violet-50"
              />
            </div>
          </motion.div>
        )}

        {view === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="h-screen bg-slate-50"
          >
            {renderActivity()}
          </motion.div>
        )}

        {view === 'general-knowledge' && (
          <GeneralKnowledge onBack={() => setView('home')} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityCard({ title, desc, icon, completed, onClick, color }: { 
  title: string, 
  desc: string, 
  icon: React.ReactNode, 
  completed?: boolean,
  onClick: () => void,
  color: string
}) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-6 p-8 bg-white border-2 border-slate-100 rounded-[2rem] text-left hover:border-indigo-200 transition-all group relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
    >
      <div className={`p-5 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
      </div>
      <div className="flex-1">
        <h4 className="text-2xl font-black text-slate-900 mb-1">{title}</h4>
        <p className="text-sm font-medium text-slate-600">{desc}</p>
      </div>
      {completed && (
        <div className="absolute top-6 right-6">
          <div className="bg-yellow-100 p-2 rounded-full">
            <Trophy size={18} className="text-yellow-600" />
          </div>
        </div>
      )}
    </motion.button>
  );
}
