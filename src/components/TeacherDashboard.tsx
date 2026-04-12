import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, Plus, Trash2, Edit2, CheckCircle2, Users, BookOpen as BookIcon, UserPlus, X, Brain, ChevronUp, ChevronDown, GripVertical, Zap } from 'lucide-react';
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
    addLesson,
    reorderLessons
  } = useAppStore();
  
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  
  const selectedLesson = customLessons.find(l => l.id === selectedLessonId);

  const handleUpdateLessonTitle = (title: string) => {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, { title });
  };

  const handleUpdateLessonSubtitle = (subtitle: string) => {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.id, { subtitle });
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

  const handleUpdateAssignment = (index: number, updates: { question?: string, answer?: string }) => {
    if (!selectedLesson) return;
    const newAssignments = [...(selectedLesson.assignments || [])];
    newAssignments[index] = { ...(newAssignments[index] || { question: '', answer: '' }), ...updates };
    updateLesson(selectedLesson.id, { assignments: newAssignments });
  };

  const handleAddQuestion = () => {
    if (!selectedLesson) return;
    const newAssignments = [...(selectedLesson.assignments || []), { question: '', answer: '' }];
    updateLesson(selectedLesson.id, { assignments: newAssignments });
  };

  const handleRemoveQuestion = (index: number) => {
    if (!selectedLesson) return;
    const newAssignments = (selectedLesson.assignments || []).filter((_, i) => i !== index);
    updateLesson(selectedLesson.id, { assignments: newAssignments });
  };

  const handleUpdateVerb = (index: number, updates: Partial<Vocabulary>) => {
    if (!selectedLesson) return;
    const newVerbs = [...(selectedLesson.verbs || [])];
    newVerbs[index] = { ...newVerbs[index], ...updates };
    updateLesson(selectedLesson.id, { verbs: newVerbs });
  };

  const handleAddVerb = () => {
    if (!selectedLesson) return;
    const newVerbs = [...(selectedLesson.verbs || []), { word: 'NEW VERB', translation: 'Tradução', type: 'verb' as const }];
    updateLesson(selectedLesson.id, { verbs: newVerbs });
  };

  const handleRemoveVerb = (index: number) => {
    if (!selectedLesson) return;
    const newVerbs = (selectedLesson.verbs || []).filter((_, i) => i !== index);
    updateLesson(selectedLesson.id, { verbs: newVerbs });
  };

  const handleAddLesson = () => {
    const newId = Math.max(...customLessons.map(l => l.id), 0) + 1;
    const newLesson: LessonData = {
      id: newId,
      title: `New Lesson ${newId}`,
      vocabulary: [{ word: 'HELLO', translation: 'Olá' }],
      phrases: ['HELLO WORLD'],
      assignments: [{ question: 'How do you say hello?', answer: 'Hello' }]
    };
    addLesson(newLesson);
    setSelectedLessonId(newId);
  };

  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    const newLessons = [...customLessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;
    
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    reorderLessons(newLessons);
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
            <button 
              onClick={handleSave}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
            >
              <Save size={20} />
              {showSaved ? 'Saved!' : 'Save All'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lesson List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Lessons</h2>
              <button 
                onClick={handleAddLesson}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                title="Add New Lesson"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {customLessons.map((lesson, index) => (
                <div key={lesson.id} className="group relative">
                  <button
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={cn(
                      "w-full p-6 rounded-3xl border-2 text-left transition-all font-black pr-16",
                      selectedLessonId === lesson.id
                        ? "bg-white border-indigo-600 shadow-xl shadow-indigo-500/10 text-indigo-600"
                        : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate">{lesson.title}</span>
                      <span className="text-[10px] opacity-40 font-mono">ID:{lesson.id}</span>
                    </div>
                  </button>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMoveLesson(index, 'up'); }}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMoveLesson(index, 'down'); }}
                      disabled={index === customLessons.length - 1}
                      className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Lesson Details */}
                <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Title</label>
                        <input 
                          type="text"
                          value={selectedLesson.title}
                          onChange={(e) => handleUpdateLessonTitle(e.target.value)}
                          className="text-3xl font-black text-slate-900 tracking-tight bg-transparent border-b-2 border-transparent focus:border-indigo-600 outline-none w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Subtitle</label>
                        <input 
                          type="text"
                          value={selectedLesson.subtitle || ''}
                          onChange={(e) => handleUpdateLessonSubtitle(e.target.value)}
                          className="text-lg font-bold text-indigo-600 tracking-tight bg-transparent border-b-2 border-transparent focus:border-indigo-600 outline-none w-full"
                          placeholder="e.g. Basic Fruits and Colors"
                        />
                      </div>
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
                </div>

                {/* Verbs Editor */}
                <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <Zap size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lesson Verbs</h2>
                        <p className="text-slate-500 font-medium">Add verbs for the dedicated verb session.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleAddVerb}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black hover:bg-indigo-100 transition-all"
                    >
                      <Plus size={20} /> Add Verb
                    </button>
                  </div>

                  <div className="space-y-6">
                    {(selectedLesson.verbs || []).map((verb, index) => (
                      <div key={index} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verb (English)</label>
                                <input 
                                  type="text"
                                  value={verb.word}
                                  onChange={(e) => handleUpdateVerb(index, { word: e.target.value.toUpperCase() })}
                                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Translation</label>
                                <input 
                                  type="text"
                                  value={verb.translation}
                                  onChange={(e) => handleUpdateVerb(index, { translation: e.target.value })}
                                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex md:flex-col justify-end gap-2">
                            <button 
                              onClick={() => handleRemoveVerb(index)}
                              className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(selectedLesson.verbs || []).length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                        <p className="font-bold">No verbs added yet.</p>
                        <button 
                          onClick={handleAddVerb}
                          className="mt-4 text-indigo-600 font-black hover:underline"
                        >
                          Add your first verb
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Editor */}
                <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Extra Assignment</h2>
                        <p className="text-slate-500 font-medium">Define questions for this lesson's assignment.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleAddQuestion}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black hover:bg-indigo-100 transition-all"
                    >
                      <Plus size={20} /> Add Question
                    </button>
                  </div>

                  <div className="space-y-6">
                    {(selectedLesson.assignments || []).map((q, index) => (
                      <div key={index} className="p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question</label>
                              <input 
                                type="text"
                                value={q.question}
                                onChange={(e) => handleUpdateAssignment(index, { question: e.target.value })}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Enter question..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correct Answer</label>
                              <input 
                                type="text"
                                value={q.answer}
                                onChange={(e) => handleUpdateAssignment(index, { answer: e.target.value })}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Enter correct answer..."
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveQuestion(index)}
                            className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(selectedLesson.assignments || []).length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                        <p className="font-bold">No questions added yet.</p>
                        <button 
                          onClick={handleAddQuestion}
                          className="mt-4 text-indigo-600 font-black hover:underline"
                        >
                          Add your first question
                        </button>
                      </div>
                    )}
                  </div>
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
      </div>
    </div>
  );
}
