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
  X,
  Save,
  CheckCircle2,
  User,
  ShieldCheck,
  Keyboard,
  ClipboardList
} from 'lucide-react';
import { LESSONS, LessonData } from './data/lessons';
import { useAppStore } from './store/useAppStore';
import { cn } from './lib/utils';
import Flashcards from './components/Flashcards';
import BubbleGame from './components/BubbleGame';
import Hangman from './components/Hangman';
import { WordScramble } from './components/WordScramble';
import PianoFail from './components/PianoFail';
import GeneralKnowledge from './components/GeneralKnowledge';
import TeacherDashboard from './components/TeacherDashboard';
import { Assignment } from './components/Assignment';
import GeneralCards from './components/GeneralCards';

type View = 'landing' | 'home' | 'lesson-detail' | 'activity' | 'assignment' | 'general-knowledge' | 'teacher' | 'general-cards';
type ActivityType = 'flashcards' | 'bubble' | 'hangman' | 'scramble' | 'piano';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

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
    userProgress,
    customLessons,
    initialized,
    initFirestore,
    syncUserData,
    loginAsTeacher,
    loginAsStudent,
    completeActivity,
    completeAssignment
  } = useAppStore();

  const [view, setView] = useState<View>('landing');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [selectedLesson, setSelectedLesson] = useState<LessonData | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [loginMode, setLoginMode] = useState<'student' | 'teacher' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = initFirestore();
    return () => unsub();
  }, [initFirestore]);

  // Sync user data effect
  useEffect(() => {
    if (initialized && currentUser) {
      const unsub = syncUserData(currentUser, currentUser === 'teacher');
      return () => unsub();
    }
  }, [initialized, currentUser, syncUserData]);

  // If user was already logged in (from persist), make sure they are in the right view
  useEffect(() => {
    if (initialized && currentUser) {
      if (currentUser === 'teacher') {
        setView('teacher');
      } else {
        setView('home');
      }
    }
  }, [initialized, currentUser]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-8"
        >
          <Zap size={64} className="text-amber-400" />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter mb-4">LEXICON</h1>
        <p className="text-indigo-200 font-bold animate-pulse uppercase tracking-widest text-sm">Connecting to Cloud...</p>
      </div>
    );
  }

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (loginMode === 'teacher') {
        if (username === 'teacher' && password === 'adminadminadmin123') {
          await loginAsTeacher();
          setView('teacher');
        } else {
          setError('Invalid teacher credentials');
        }
      } else if (loginMode === 'student') {
        if (!username.trim()) {
          setError('Please enter your name');
          return;
        }
        await loginAsStudent(username);
        setView('home');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
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
      case 'flashcards': return <Flashcards {...props} onComplete={() => { completeActivity(selectedLesson.id, 'flashcards'); setView('lesson-detail'); }} />;
      case 'bubble': return <BubbleGame {...props} onComplete={() => { completeActivity(selectedLesson.id, 'bubble'); setView('lesson-detail'); }} />;
      case 'hangman': return <Hangman {...props} onComplete={() => { completeActivity(selectedLesson.id, 'hangman'); setView('lesson-detail'); }} />;
      case 'scramble': return <WordScramble vocabulary={selectedLesson.vocabulary} onComplete={() => { completeActivity(selectedLesson.id, 'scramble'); }} onClose={() => setView('lesson-detail')} />;
      case 'piano': return <PianoFail {...props} onComplete={() => { completeActivity(selectedLesson.id, 'piano'); setView('lesson-detail'); }} />;
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
                <div className="flex flex-col gap-6 w-full">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest text-center">Choose your device</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['mobile', 'tablet', 'desktop'] as DeviceType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setDeviceType(type)}
                          className={cn(
                            "py-3 rounded-2xl font-black text-xs transition-all border-2",
                            deviceType === type 
                              ? "bg-white text-indigo-600 border-white shadow-lg" 
                              : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                          )}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => { loginAsStudent('Local Student'); setView('home'); }}
                    className="px-12 py-6 bg-white text-indigo-600 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <User size={28} /> Start Learning
                  </button>
                  <button
                    onClick={() => setLoginMode('teacher')}
                    className="px-12 py-4 bg-indigo-500/30 hover:bg-indigo-500/40 text-white border border-white/20 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={20} /> Teacher Mode
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
                      {loginMode === 'teacher' ? 'Teacher Login' : 'Enter Your Name'}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2 ml-1">
                        {loginMode === 'teacher' ? 'Username' : 'Your Name'}
                      </label>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-6 py-4 bg-white/10 border border-white/20 focus:border-white rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/30"
                        placeholder={loginMode === 'teacher' ? 'Enter username' : 'Enter your name'}
                      />
                    </div>
                    {loginMode === 'teacher' && (
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
                    )}
                    
                    {error && (
                      <p className="text-red-300 text-sm font-bold text-center bg-red-500/20 py-2 rounded-xl border border-red-500/30">{error}</p>
                    )}

                    <button 
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap size={24} />
                        </motion.div>
                      ) : (
                        loginMode === 'teacher' ? 'Login' : 'Start'
                      )}
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
            className={cn(
              "mx-auto p-6 pt-12 transition-all duration-500",
              deviceType === 'mobile' ? "max-w-md" : deviceType === 'tablet' ? "max-w-3xl" : "max-w-6xl"
            )}
          >
            <header className={cn(
              "flex flex-col justify-between gap-8 mb-16",
              deviceType !== 'mobile' && "md:flex-row md:items-center"
            )}>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className={cn(
                    "font-black tracking-tighter text-slate-900",
                    deviceType === 'mobile' ? "text-4xl" : "text-6xl"
                  )}>
                    Lexicon<span className="text-indigo-600">.</span>
                  </h1>
                </div>
                <p className="text-slate-700 text-lg font-medium">Master your vocabulary through play.</p>
              </div>
              <div className={cn(
                "flex flex-wrap gap-3",
                deviceType === 'mobile' && "grid grid-cols-2"
              )}>
                <button 
                  onClick={handleLogout}
                  className="px-6 py-4 bg-white border-2 border-slate-200 rounded-[2rem] hover:border-rose-500 hover:text-rose-600 transition-all font-black text-slate-800 shadow-sm text-sm"
                >
                  Logout
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-200 rounded-[2rem] hover:border-indigo-500 transition-all font-black text-slate-800 shadow-sm text-sm"
                >
                  <Save size={20} className={cn(showSaved && "text-emerald-500")} />
                  {showSaved ? 'Saved!' : 'Save'}
                </button>
                <button 
                  onClick={() => setView('general-knowledge')}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-200 rounded-[2rem] hover:border-indigo-500 transition-all font-black text-slate-800 shadow-sm text-sm"
                >
                  <Brain size={20} className="text-indigo-600" />
                  Knowledge
                </button>
                <button 
                  onClick={() => setView('general-cards')}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 rounded-[2rem] hover:bg-indigo-700 transition-all font-black text-white shadow-xl shadow-indigo-500/20 text-sm"
                >
                  <Star size={20} className="fill-white" />
                  General Cards
                </button>
              </div>
            </header>

            <div className={cn(
              "grid gap-6",
              deviceType === 'mobile' ? "grid-cols-1" : deviceType === 'tablet' ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              {customLessons.map((lesson, index) => {
                const unlocked = isLessonUnlocked(lesson.id);
                const stars = getStarsCount(lesson.id);
                const assignmentCompleted = currentUser ? userProgress[currentUser]?.[lesson.id]?.assignmentCompleted : false;
                
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
                        ? (assignmentCompleted 
                            ? "bg-green-50 border-green-200 hover:border-green-500 hover:shadow-xl cursor-pointer" 
                            : (stars >= 4 
                                ? "bg-yellow-50 border-yellow-200 hover:border-yellow-500 hover:shadow-xl cursor-pointer"
                                : "bg-white border-slate-200 hover:border-indigo-500 hover:shadow-xl cursor-pointer"
                              )
                          )
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
                title="Word Scramble" 
                desc="Unscramble letters to form words" 
                icon={<Keyboard className="text-indigo-500" />}
                completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.stars.scramble : false}
                onClick={() => handleActivitySelect('scramble')}
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
              <div className="md:col-span-2">
                <ActivityCard 
                  title="Extra Assignment" 
                  desc="Test your knowledge with 10 questions" 
                  icon={<ClipboardList className="text-emerald-600" />}
                  completed={currentUser ? userProgress[currentUser]?.[selectedLesson.id]?.assignmentCompleted : false}
                  onClick={() => setView('assignment')}
                  color="bg-emerald-50"
                />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'assignment' && selectedLesson && (
          <Assignment 
            questions={selectedLesson.assignments || []}
            onComplete={() => completeAssignment(selectedLesson.id)}
            onClose={() => setView('lesson-detail')}
          />
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

        {view === 'general-cards' && (
          <GeneralCards onBack={() => setView('home')} />
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
