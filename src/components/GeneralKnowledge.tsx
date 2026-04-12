import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Brain, Search, Plus, Trash2, Edit2, MessageSquare, HelpCircle, X, Save, Zap } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface GeneralKnowledgeProps {
  onBack: () => void;
}

export default function GeneralKnowledge({ onBack }: GeneralKnowledgeProps) {
  const { 
    currentUser,
    isLessonUnlocked, 
    userNotes, 
    addNote, 
    deleteNote, 
    updateNote, 
    userStats, 
    updateVocabStats, 
    incrementViewCount,
    updateStudentActivity,
    favoriteCards,
    customLessons
  } = useAppStore();

  const [view, setView] = useState<'selection' | 'list'>('selection');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  const [noteType, setNoteType] = useState<'sentence' | 'qa'>('sentence');
  const [noteText, setNoteText] = useState('');
  const [noteAnswer, setNoteAnswer] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'english' | 'portuguese' | 'lesson' | 'practice' | 'views'>('english');
  const [filterType, setFilterType] = useState<'all' | 'verbs'>('all');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const currentUserNotes = (currentUser && userNotes[currentUser]) || {};
  const currentUserStats = (currentUser && userStats[currentUser]) || {};
  const favorites = (currentUser && favoriteCards[currentUser]) || [];

  const unlockedVocabulary = customLessons
    .filter(lesson => isLessonUnlocked(lesson.id))
    .flatMap(lesson => {
      const vocab = lesson.vocabulary.map(v => ({ ...v, lessonId: lesson.id }));
      const verbs = (lesson.verbs || []).map(v => ({ ...v, lessonId: lesson.id, isVerb: true }));
      return [...vocab, ...verbs];
    })
    .filter(item => {
      const stats = currentUserStats[item.word];
      return stats && (stats.viewCount > 0 || stats.difficulty > 0);
    });

  const filteredVocab = unlockedVocabulary
    .filter(v => {
      const matchesSearch = v.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           v.translation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || (filterType === 'verbs' && (v.type === 'verb' || (v as any).isVerb));
      const stats = currentUserStats[v.word] || { difficulty: 0, viewCount: 0 };
      const matchesRating = filterRating === 'all' || stats.difficulty === filterRating;
      
      return matchesSearch && matchesType && matchesRating;
    })
    .sort((a, b) => {
      const statsA = currentUserStats[a.word] || { difficulty: 0, viewCount: 0 };
      const statsB = currentUserStats[b.word] || { difficulty: 0, viewCount: 0 };

      if (sortBy === 'english') return a.word.localeCompare(b.word);
      if (sortBy === 'portuguese') return a.translation.localeCompare(b.translation);
      if (sortBy === 'lesson') return a.lessonId - b.lessonId;
      if (sortBy === 'views') return statsB.viewCount - statsA.viewCount;
      if (sortBy === 'practice') {
        const countA = currentUserNotes[a.word]?.length || 0;
        const countB = currentUserNotes[b.word]?.length || 0;
        return countB - countA;
      }
      return 0;
    });

  const handleWordSelect = (item: any) => {
    setSelectedWord(item);
    incrementViewCount(item.word);
    if (currentUser && currentUser !== 'teacher') {
      const wordIndex = item.lessonId ? customLessons.find(l => l.id === item.lessonId)?.vocabulary.findIndex(v => v.word === item.word) : 0;
      updateStudentActivity(currentUser, { 
        lessonId: item.lessonId, 
        wordIndex: wordIndex !== -1 ? wordIndex : 0 
      });
    }
  };

  const handleDifficultyUpdate = (word: string, difficulty: number) => {
    updateVocabStats(word, { difficulty });
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !selectedWord) return;
    addNote(selectedWord.word, {
      type: noteType,
      text: noteText,
      answer: noteType === 'qa' ? noteAnswer : undefined
    });
    setNoteText('');
    setNoteAnswer('');
  };

  const handleUpdateNote = () => {
    if (!noteText.trim() || !selectedWord || !editingNoteId) return;
    updateNote(selectedWord.word, editingNoteId, {
      type: noteType,
      text: noteText,
      answer: noteType === 'qa' ? noteAnswer : undefined
    });
    setEditingNoteId(null);
    setNoteText('');
    setNoteAnswer('');
  };

  const startEdit = (note: any) => {
    setEditingNoteId(note.id);
    setNoteText(note.text);
    setNoteAnswer(note.answer || '');
    setNoteType(note.type);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-6xl mx-auto p-6 pt-12"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-slate-700 shadow-sm border border-slate-200">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
              General Knowledge
            </h2>
            <p className="text-slate-700 font-medium">Review all vocabulary and verbs from your lessons.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type:</span>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent text-sm font-black text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Words</option>
              <option value="verbs">Verbs Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating:</span>
            <select 
              value={filterRating} 
              onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent text-sm font-black text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Ratings</option>
              {[...Array(11)].map((_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-sm font-black text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="english">English A-Z</option>
              <option value="portuguese">Portuguese A-Z</option>
              <option value="lesson">Lesson Number</option>
              <option value="views">Most Viewed</option>
              <option value="practice">Custom Practice Count</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search vocabulary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all w-full md:w-64 shadow-sm font-medium"
            />
          </div>
        </div>
      </header>

      {filteredVocab.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVocab.map((item, i) => {
            const stats = currentUserStats[item.word] || { difficulty: 0, viewCount: 0 };
            const isVerb = item.type === 'verb' || (item as any).isVerb;
            
            // Background color based on difficulty: 0 (green) to 10 (red)
            const hue = 140 - (stats.difficulty * 14);
            const bgColor = `hsl(${hue}, 100%, 97%)`;

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01 }}
                onClick={() => handleWordSelect(item)}
                style={{ backgroundColor: bgColor }}
                className={cn(
                  "p-6 border-2 rounded-[2rem] hover:border-indigo-500 transition-all group shadow-sm hover:shadow-xl text-left relative overflow-hidden",
                  isVerb ? "border-indigo-400 border-dashed" : "border-slate-200"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/80 backdrop-blur-sm text-[10px] font-black text-slate-600 rounded-lg uppercase tracking-wider border border-slate-100">
                      Lesson {item.lessonId}
                    </span>
                    {isVerb && (
                      <span className="px-3 py-1 bg-indigo-600 text-[10px] font-black text-white rounded-lg uppercase tracking-wider">
                        Verb
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-slate-400 font-black text-[10px]">
                      <Search size={10} />
                      {stats.viewCount}
                    </div>
                    {stats.difficulty > 0 && (
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-md bg-white/80",
                        stats.difficulty > 7 ? "text-rose-600" : stats.difficulty > 4 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        D: {stats.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{item.word}</h4>
                <p className="text-slate-700 font-medium">{item.translation}</p>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <Brain size={64} className="mx-auto text-slate-200 mb-6" />
          <p className="text-slate-600 font-black text-xl">No vocabulary found.</p>
          <p className="text-slate-500 font-medium mt-2">Keep learning to unlock more!</p>
        </div>
      )}

      <AnimatePresence>
        {selectedWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWord(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-100 text-[10px] font-black text-indigo-700 rounded-lg uppercase tracking-wider">
                      Lesson {selectedWord.lessonId}
                    </span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedWord.word}</h3>
                  <p className="text-xl text-slate-600 font-medium mb-4">{selectedWord.translation}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Difficulty</span>
                      <div className="flex gap-1">
                        {[...Array(11)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => handleDifficultyUpdate(selectedWord.word, i)}
                            className={cn(
                              "w-6 h-6 rounded-md text-[10px] font-black transition-all border",
                              (currentUserStats[selectedWord.word]?.difficulty || 0) === i 
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                                : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300"
                            )}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWord(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="mb-8">
                  <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-indigo-600" />
                    Add Custom Practice
                  </h5>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => setNoteType('sentence')}
                        className={cn(
                          "px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2",
                          noteType === 'sentence' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white text-slate-600 border border-slate-200"
                        )}
                      >
                        <MessageSquare size={14} /> Sentence
                      </button>
                      <button 
                        onClick={() => setNoteType('qa')}
                        className={cn(
                          "px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2",
                          noteType === 'qa' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white text-slate-600 border border-slate-200"
                        )}
                      >
                        <HelpCircle size={14} /> Q&A
                      </button>
                    </div>
                    <textarea 
                      placeholder={noteType === 'sentence' ? "Write a sentence using this word..." : "Write a question..."}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all font-medium mb-3 min-h-[100px]"
                    />
                    {noteType === 'qa' && (
                      <textarea 
                        placeholder="Write the answer..."
                        value={noteAnswer}
                        onChange={(e) => setNoteAnswer(e.target.value)}
                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all font-medium mb-3"
                      />
                    )}
                    <button 
                      onClick={handleAddNote}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      {editingNoteId ? <Save size={20} /> : <Plus size={20} />}
                      {editingNoteId ? 'Update Practice' : 'Add to Practice'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">My Notes</h5>
                  {currentUserNotes[selectedWord.word]?.length > 0 ? (
                    currentUserNotes[selectedWord.word].map((note) => (
                      <div key={note.id} className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] group relative hover:border-indigo-200 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                            {note.type === 'sentence' ? 'Sentence' : 'Q&A'}
                          </span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(note)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteNote(selectedWord.word, note.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-900 font-bold text-lg leading-tight mb-2">{note.text}</p>
                        {note.type === 'qa' && (
                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">Answer:</p>
                            <p className="text-slate-700 font-medium">{note.answer}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No custom notes yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
