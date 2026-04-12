import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Check, X, Star, Trash2, Eye, Edit3, MessageSquare, HelpCircle } from 'lucide-react';
import { Vocabulary } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface GeneralCardsProps {
  onBack: () => void;
}

const DIFFICULTY_COLORS = {
  0: 'bg-white border-slate-100',
  1: 'bg-green-50 border-green-200',
  2: 'bg-yellow-50 border-yellow-200',
  3: 'bg-orange-50 border-orange-200',
  4: 'bg-red-50 border-red-200',
  5: 'bg-purple-50 border-purple-200',
};

const DIFFICULTY_TEXT = {
  0: 'Unrated',
  1: 'Very Easy',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

export default function GeneralCards({ onBack }: GeneralCardsProps) {
  const { currentUser, favoriteCards, customLessons, toggleFavoriteCard, userStats, userNotes, updateVocabStats } = useAppStore();
  const [view, setView] = useState<'selection' | 'cards'>('selection');
  const [filterType, setFilterType] = useState<'all' | 'verbs' | 'practice'>('all');
  const [pool, setPool] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const favorites = favoriteCards[currentUser] || [];
      const allVocab = customLessons.flatMap(l => {
        const vocab = l.vocabulary.map(v => ({ ...v, lessonId: l.id, origin: 'vocabulary' }));
        const verbs = (l.verbs || []).map(v => ({ ...v, lessonId: l.id, origin: 'verbs' }));
        return [...vocab, ...verbs];
      });
      
      const filtered = allVocab.filter(v => {
        if (filterType === 'practice') {
          const notes = userNotes[currentUser]?.[v.word] || [];
          return notes.length > 0;
        }
        const isFavorite = favorites.includes(v.word);
        if (!isFavorite) return false;
        if (filterType === 'verbs') return (v as any).origin === 'verbs';
        return (v as any).origin === 'vocabulary';
      });

      // Remove duplicates if any
      const unique = Array.from(new Map(filtered.map(v => [v.word, v])).values());
      setPool(unique);
    }
  }, [currentUser, favoriteCards, customLessons, filterType]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);
    setShowRatingSelector(false);
    setShowNotes(false);
    setCurrentIndex((currentIndex + 1) % pool.length);
  };

  const handleRemove = (word: string) => {
    toggleFavoriteCard(word);
    if (pool.length <= 1) {
      setView('selection');
    } else if (currentIndex >= pool.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleUpdateRating = async (rating: number) => {
    if (currentUser && currentCard) {
      await updateVocabStats(currentCard.word, { difficulty: rating });
      setShowRatingSelector(false);
    }
  };

  if (view === 'selection') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto p-6 pt-24"
      >
        <header className="flex items-center gap-4 mb-16">
          <button onClick={onBack} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-600 shadow-sm border border-slate-100">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Study <span className="text-indigo-600">Cards</span></h2>
            <p className="text-slate-500 font-medium">Select what you want to study from your favorites.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => { setFilterType('verbs'); setView('cards'); setCurrentIndex(0); }}
            className="group p-12 bg-white border-4 border-slate-100 rounded-[4rem] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left relative overflow-hidden"
          >
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Star size={40} />
            </div>
            <h3 className="text-4xl font-black text-slate-900 mb-2">Favorited Verbs</h3>
            <p className="text-slate-500 font-medium text-lg">Review all verbs you've marked as favorites.</p>
          </button>

          <button
            onClick={() => { setFilterType('all'); setView('cards'); setCurrentIndex(0); }}
            className="group p-12 bg-white border-4 border-slate-100 rounded-[4rem] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all text-left relative overflow-hidden"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Star size={40} />
            </div>
            <h3 className="text-4xl font-black text-slate-900 mb-2">Favorited Words</h3>
            <p className="text-slate-500 font-medium text-lg">Review all vocabulary you've marked as favorites.</p>
          </button>
        </div>
      </motion.div>
    );
  }

  if (pool.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-24 h-24 bg-amber-100 rounded-[2.5rem] flex items-center justify-center mb-8">
          <Star size={48} className="text-amber-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">No cards yet!</h2>
        <p className="text-slate-500 font-medium text-center max-w-xs mb-8">
          Favorite cards in your lessons to see them here for extra study.
        </p>
        <button 
          onClick={() => setView('selection')}
          className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentCard = pool[currentIndex];
  const stats = currentUser ? userStats[currentUser]?.[currentCard.word] : null;
  const notes = currentUser ? userNotes[currentUser]?.[currentCard.word] || [] : [];
  const difficulty = stats?.difficulty || 0;
  const viewCount = stats?.viewCount || 0;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="p-6 flex items-center justify-between max-w-2xl mx-auto w-full">
        <button onClick={() => setView('selection')} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-600 shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black text-slate-900">
          {filterType === 'verbs' ? 'Favorited Verbs' : filterType === 'practice' ? 'Custom Practices' : 'Favorited Words'}
        </h2>
        <div className="text-sm font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
          {currentIndex + 1} / {pool.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full gap-8">
        <div className="relative w-full aspect-[4/3] perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.word}
              initial={{ y: 50, opacity: 0, rotateX: -10 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: -50, opacity: 0, rotateX: 10 }}
              className="w-full h-full cursor-pointer preserve-3d"
              onClick={handleFlip}
            >
              <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
              >
                {/* Front */}
                <div className={cn(
                  "absolute inset-0 backface-hidden border-2 rounded-[3rem] flex flex-col items-center justify-center p-8 shadow-xl transition-colors duration-500",
                  DIFFICULTY_COLORS[difficulty as keyof typeof DIFFICULTY_COLORS]
                )}>
                  <div className="absolute top-8 left-8 flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/50">
                      <Eye size={16} className="text-slate-400" />
                      <span className="text-xs font-black text-slate-600">{viewCount} views</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/50">
                      <Edit3 size={16} className="text-slate-400" />
                      <span className="text-xs font-black text-slate-600">{DIFFICULTY_TEXT[difficulty as keyof typeof DIFFICULTY_TEXT]}</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemove(currentCard.word); }}
                    className="absolute top-8 right-8 p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"
                    title="Remove from favorites"
                  >
                    <Trash2 size={24} />
                  </button>

                  <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight text-center">
                    {currentCard.word}
                  </h2>

                  <AnimatePresence>
                    {showNotes && notes.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-16 left-8 right-8"
                      >
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <MessageSquare size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">My Notes</span>
                        </div>
                        <div className="max-h-20 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {notes.map((note, i) => (
                            <div key={i} className="bg-white/40 p-2 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/30">
                              {note.text}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="absolute bottom-8 text-slate-400 text-xs font-black uppercase tracking-widest">Click to flip</p>
                </div>

                {/* Back */}
                <div 
                  className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-indigo-400 rounded-[3rem] flex flex-col items-center justify-center p-8 shadow-2xl"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight text-center">
                    {currentCard.translation}
                  </h2>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <div className="flex gap-3">
            <button
              onClick={() => setShowRatingSelector(!showRatingSelector)}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 font-black text-sm shadow-sm hover:border-indigo-200 transition-all"
            >
              <Edit3 size={18} />
              Rating
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 border-2 rounded-2xl font-black text-sm transition-all",
                showNotes ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-100 text-slate-600 shadow-sm hover:border-indigo-200"
              )}
            >
              <MessageSquare size={18} />
              Practice
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
            >
              Next
            </button>
          </div>

          <AnimatePresence>
            {showRatingSelector && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-xl"
              >
                <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-4">How difficult is this card?</p>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleUpdateRating(r)}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-black text-sm transition-all border-2",
                        difficulty === r 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" 
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
