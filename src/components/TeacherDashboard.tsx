import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, Plus, Trash2, Edit2, CheckCircle2, Users, BookOpen as BookIcon, UserPlus, X, Brain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LessonData, Vocabulary } from '../data/lessons';
import { cn } from '../lib/utils';

interface TeacherDashboardProps {
  onBack: () => void;
}

export default function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  const { 
    customLessons, 
    updateLesson, 
    studentAccounts, 
    addStudent, 
    deleteStudent,
    studentActivity,
    userProgress,
    userNotes,
    updateUserNote,
    getStarsCount
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  
  // Student monitoring state
  const [viewingStudentNotes, setViewingStudentNotes] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ username: string, word: string, noteId: string } | null>(null);

  // Student form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const selectedLesson = customLessons.find(l => l.id === selectedLessonId);

  const handleUpdateLessonTitle = (title: string) => {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, { title });
  };

  const handleUpdateVocabulary = (index: number, updates: Partial<Vocabulary>) => {
    if (!selectedLesson) return;
    const newVocab = [...selectedLesson.vocabulary];
    newVocab[index] = { ...newVocab[index], ...updates };
    updateLesson(selectedLesson.id, { vocabulary: newVocab });
  };

  const handleUpdatePhrase = (index: number, phrase: string) => {
    if (!selectedLesson) return;
    const newPhrases = [...selectedLesson.phrases];
    newPhrases[index] = phrase.toUpperCase();
    updateLesson(selectedLesson.id, { phrases: newPhrases });
  };

  const handleAddWord = () => {
    if (!selectedLesson) return;
    const newVocab = [...selectedLesson.vocabulary, { word: 'NEW WORD', translation: 'Tradução' }];
    const newPhrases = [...selectedLesson.phrases, 'NEW PHRASE FOR THIS WORD'];
    updateLesson(selectedLesson.id, { vocabulary: newVocab, phrases: newPhrases });
  };

  const handleRemoveWord = (index: number) => {
    if (!selectedLesson) return;
    const newVocab = selectedLesson.vocabulary.filter((_, i) => i !== index);
    const newPhrases = selectedLesson.phrases.filter((_, i) => i !== index);
    updateLesson(selectedLesson.id, { vocabulary: newVocab, phrases: newPhrases });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    if (studentAccounts.some(s => s.username === newUsername)) {
      alert('Username already exists');
      return;
    }
    await addStudent({ username: newUsername, password: newPassword });
    setNewUsername('');
    setNewPassword('');
  };

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold mb-4 group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Exit Teacher Mode
            </button>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">
              Teacher <span className="text-indigo-600">Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white p-1.5 rounded-[2rem] border-2 border-slate-100 shadow-sm">
              <button 
                onClick={() => setActiveTab('lessons')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all",
                  activeTab === 'lessons' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <BookIcon size={18} /> Lessons
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all",
                  activeTab === 'students' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Users size={18} /> Students
              </button>
            </div>
            <button 
              onClick={handleSave}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
            >
              <Save size={20} />
              {showSaved ? 'Saved!' : 'Save All'}
            </button>
          </div>
        </header>

        {activeTab === 'lessons' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lesson List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest">Select Lesson</h2>
              <div className="grid grid-cols-1 gap-3">
                {customLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={cn(
                      "p-6 rounded-3xl border-2 text-left transition-all font-black",
                      selectedLessonId === lesson.id
                        ? "bg-white border-indigo-600 shadow-xl shadow-indigo-500/10 text-indigo-600"
                        : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span>{lesson.title}</span>
                      <span className="text-xs opacity-50">ID: {lesson.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2">
              {selectedLesson ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Title</label>
                      <input 
                        type="text"
                        value={selectedLesson.title}
                        onChange={(e) => handleUpdateLessonTitle(e.target.value)}
                        className="text-3xl font-black text-slate-900 tracking-tight bg-transparent border-b-2 border-transparent focus:border-indigo-600 outline-none w-full"
                      />
                    </div>
                    <button 
                      onClick={handleAddWord}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={20} /> Add Word
                    </button>
                  </div>

                  <div className="space-y-6">
                    {selectedLesson.vocabulary.map((vocab, index) => (
                      <div key={index} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">English Word</label>
                                <input 
                                  type="text"
                                  value={vocab.word}
                                  onChange={(e) => handleUpdateVocabulary(index, { word: e.target.value.toUpperCase() })}
                                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Translation</label>
                                <input 
                                  type="text"
                                  value={vocab.translation}
                                  onChange={(e) => handleUpdateVocabulary(index, { translation: e.target.value })}
                                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Piano Fail Phrase</label>
                              <input 
                                type="text"
                                value={selectedLesson.phrases[index] || ''}
                                onChange={(e) => handleUpdatePhrase(index, e.target.value)}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Type a phrase for this word..."
                              />
                            </div>
                          </div>
                          <div className="flex md:flex-col justify-end gap-2">
                            <button 
                              onClick={() => handleRemoveWord(index)}
                              className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-4 border-dashed border-slate-200 rounded-[3rem]">
                  <Edit2 size={48} className="mb-4 opacity-20" />
                  <p className="text-xl font-black uppercase tracking-widest">Select a lesson to start editing</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Add Student Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <UserPlus size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Student</h2>
                </div>
                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                    <input 
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold"
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold"
                      placeholder="Enter password"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 transition-all"
                  >
                    Create Account
                  </button>
                </form>
              </div>
            </div>

            {/* Student List */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm min-h-[500px]">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Accounts</h2>
                  <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-black uppercase tracking-widest">
                    {studentAccounts.length} Total
                  </span>
                </div>
                
                {studentAccounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Users size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-black uppercase tracking-widest">No students added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentAccounts.map((student) => {
                      const activity = studentActivity[student.username];
                      const currentLesson = activity ? customLessons.find(l => l.id === activity.lessonId) : null;
                      const currentWord = currentLesson ? currentLesson.vocabulary[activity.wordIndex] : null;
                      const stars = activity ? getStarsCount(activity.lessonId, student.username) : 0;

                      return (
                        <div key={student.username} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-xl font-black text-slate-800">{student.username}</h4>
                              <span className="text-xs font-bold text-slate-400">PW: {student.password}</span>
                            </div>
                            
                            {activity ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Lesson</p>
                                  <p className="text-sm font-bold text-indigo-600">{currentLesson?.title || 'None'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Card</p>
                                  <p className="text-sm font-bold text-slate-700">{currentWord?.word || 'None'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stars (Current)</p>
                                  <p className="text-sm font-bold text-amber-500 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> {stars}/5
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Saved</p>
                                  <p className="text-sm font-bold text-slate-500">{new Date(activity.lastSaved).toLocaleTimeString()}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-slate-400 italic">No activity yet</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setViewingStudentNotes(student.username)}
                              className="px-4 py-2 bg-white border border-slate-200 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-50 transition-all flex items-center gap-2"
                            >
                              <Brain size={14} /> General Knowledge
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${student.username}?`)) {
                                  await deleteStudent(student.username);
                                }
                              }}
                              className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Student Notes Modal */}
      <AnimatePresence>
        {viewingStudentNotes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingStudentNotes(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    General Knowledge: <span className="text-indigo-600">{viewingStudentNotes}</span>
                  </h3>
                  <p className="text-slate-500 font-medium">Review and edit student's custom sentences and Q&A.</p>
                </div>
                <button 
                  onClick={() => setViewingStudentNotes(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {Object.entries(userNotes[viewingStudentNotes] || {}).length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <Brain size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-black uppercase tracking-widest">No notes created by this student</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {Object.entries(userNotes[viewingStudentNotes] || {}).map(([word, notes]) => (
                      <div key={word} className="space-y-4">
                        <h4 className="text-xl font-black text-slate-900 border-l-4 border-indigo-600 pl-4">{word}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {notes.map((note) => (
                            <div key={note.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition-all group relative">
                              <div className="flex justify-between items-start mb-3">
                                <span className={cn(
                                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                  note.type === 'sentence' ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
                                )}>
                                  {note.type}
                                </span>
                                <button 
                                  onClick={() => setEditingNote({ username: viewingStudentNotes, word, noteId: note.id })}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>

                              {editingNote?.noteId === note.id ? (
                                <div className="space-y-4">
                                  <textarea 
                                    value={note.text}
                                    onChange={(e) => updateUserNote(viewingStudentNotes, word, note.id, { text: e.target.value })}
                                    className="w-full p-4 bg-white border-2 border-indigo-600 rounded-2xl focus:outline-none font-medium text-sm"
                                  />
                                  {note.type === 'qa' && (
                                    <textarea 
                                      value={note.answer}
                                      onChange={(e) => updateUserNote(viewingStudentNotes, word, note.id, { answer: e.target.value })}
                                      className="w-full p-4 bg-white border-2 border-indigo-600 rounded-2xl focus:outline-none font-medium text-sm"
                                    />
                                  )}
                                  <button 
                                    onClick={() => setEditingNote(null)}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200"
                                  >
                                    Done Editing
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-slate-900 font-bold leading-tight mb-2">{note.text}</p>
                                  {note.type === 'qa' && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Answer</p>
                                      <p className="text-slate-600 font-medium text-sm">{note.answer}</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
