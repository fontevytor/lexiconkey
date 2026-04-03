import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LESSONS, LessonData } from '../data/lessons';

interface CustomNote {
  id: string;
  type: 'sentence' | 'qa';
  text: string;
  answer?: string;
}

interface LessonProgress {
  stars: {
    flashcards: boolean;
    bubble: boolean;
    hangman: boolean;
    battleship: boolean;
    piano: boolean;
  };
  unlocked: boolean;
}

interface VocabularyStats {
  difficulty: number; // 0-10
  viewCount: number;
}

interface StudentAccount {
  username: string;
  password: string;
}

interface StudentActivity {
  lessonId: number;
  wordIndex: number;
  lastSaved: number;
}

interface AppState {
  userType: 'student' | 'teacher' | null;
  currentUser: string | null; // username or 'teacher'
  studentAccounts: StudentAccount[];
  studentActivity: Record<string, StudentActivity>; // Key is username
  userProgress: Record<string, Record<number, LessonProgress>>; // Key is username
  userNotes: Record<string, Record<string, CustomNote[]>>; // Key 1: username, Key 2: word
  userStats: Record<string, Record<string, VocabularyStats>>; // Key 1: username, Key 2: word
  customLessons: LessonData[];
  lastSaved: number;
  setUserType: (type: 'student' | 'teacher' | null) => void;
  setCurrentUser: (username: string | null) => void;
  addStudent: (student: StudentAccount) => void;
  deleteStudent: (username: string) => void;
  updateStudentActivity: (username: string, activity: Partial<StudentActivity>) => void;
  completeActivity: (lessonId: number, activity: keyof LessonProgress['stars']) => void;
  isLessonUnlocked: (lessonId: number) => boolean;
  getStarsCount: (lessonId: number, username?: string) => number;
  addNote: (word: string, note: Omit<CustomNote, 'id'>) => void;
  deleteNote: (word: string, noteId: string) => void;
  updateNote: (word: string, noteId: string, updates: Partial<CustomNote>) => void;
  updateUserNote: (username: string, word: string, noteId: string, updates: Partial<CustomNote>) => void;
  updateVocabStats: (word: string, updates: Partial<VocabularyStats>) => void;
  incrementViewCount: (word: string) => void;
  updateLesson: (lessonId: number, updates: Partial<LessonData>) => void;
  saveProgress: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userType: null,
      currentUser: null,
      studentAccounts: [],
      studentActivity: {},
      userProgress: {},
      userNotes: {},
      userStats: {},
      customLessons: LESSONS,
      lastSaved: Date.now(),
      setUserType: (userType) => set({ userType }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      addStudent: (student) => set((state) => ({
        studentAccounts: [...state.studentAccounts, student]
      })),
      deleteStudent: (username) => set((state) => ({
        studentAccounts: state.studentAccounts.filter(s => s.username !== username),
        studentActivity: { ...state.studentActivity, [username]: undefined },
        userProgress: { ...state.userProgress, [username]: undefined },
        userNotes: { ...state.userNotes, [username]: undefined },
        userStats: { ...state.userStats, [username]: undefined }
      })),
      updateStudentActivity: (username, activity) => set((state) => ({
        studentActivity: {
          ...state.studentActivity,
          [username]: {
            ...(state.studentActivity[username] || { lessonId: 1, wordIndex: 0, lastSaved: Date.now() }),
            ...activity,
            lastSaved: Date.now()
          }
        }
      })),
      completeActivity: (lessonId, activity) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const currentProgressMap = state.userProgress[currentUser] || {
            1: {
              stars: { flashcards: false, bubble: false, hangman: false, battleship: false, piano: false },
              unlocked: true,
            }
          };
          
          const currentProgress = currentProgressMap[lessonId] || {
            stars: { flashcards: false, bubble: false, hangman: false, battleship: false, piano: false },
            unlocked: lessonId === 1,
          };

          const newStars = { ...currentProgress.stars, [activity]: true };
          const newLessonProgress = { ...currentProgress, stars: newStars };
          const newUserProgressMap = { ...currentProgressMap, [lessonId]: newLessonProgress };

          // Check if next lesson should be unlocked
          const starsCount = Object.values(newStars).filter(Boolean).length;
          if (starsCount >= 4) {
            const nextId = lessonId + 1;
            if (!newUserProgressMap[nextId]) {
              newUserProgressMap[nextId] = {
                stars: { flashcards: false, bubble: false, hangman: false, battleship: false, piano: false },
                unlocked: true,
              };
            } else {
              newUserProgressMap[nextId].unlocked = true;
            }
          }

          return { 
            userProgress: { ...state.userProgress, [currentUser]: newUserProgressMap },
            lastSaved: Date.now() 
          };
        });
      },
      isLessonUnlocked: (lessonId) => {
        if (lessonId === 1) return true;
        const { currentUser, userProgress } = get();
        if (!currentUser || currentUser === 'teacher') return true; // Teacher sees all
        return userProgress[currentUser]?.[lessonId]?.unlocked || false;
      },
      getStarsCount: (lessonId, username) => {
        const { currentUser, userProgress } = get();
        const targetUser = username || currentUser;
        if (!targetUser || targetUser === 'teacher') return 0;
        const p = userProgress[targetUser]?.[lessonId];
        if (!p) return 0;
        return Object.values(p.stars).filter(Boolean).length;
      },
      addNote: (word, note) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const userNotesMap = state.userNotes[currentUser] || {};
          const wordNotes = userNotesMap[word] || [];
          const newNote = { ...note, id: Math.random().toString(36).substring(7) };
          
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotesMap,
                [word]: [...wordNotes, newNote],
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      deleteNote: (word, noteId) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const userNotesMap = state.userNotes[currentUser] || {};
          const wordNotes = userNotesMap[word] || [];
          
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotesMap,
                [word]: wordNotes.filter((n) => n.id !== noteId),
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      updateNote: (word, noteId, updates) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const userNotesMap = state.userNotes[currentUser] || {};
          const wordNotes = userNotesMap[word] || [];
          
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotesMap,
                [word]: wordNotes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      updateUserNote: (username, word, noteId, updates) => {
        set((state) => {
          const userNotesMap = state.userNotes[username] || {};
          const wordNotes = userNotesMap[word] || [];
          
          return {
            userNotes: {
              ...state.userNotes,
              [username]: {
                ...userNotesMap,
                [word]: wordNotes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      updateVocabStats: (word, updates) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const userStatsMap = state.userStats[currentUser] || {};
          const current = userStatsMap[word] || { difficulty: 0, viewCount: 0 };
          
          return {
            userStats: {
              ...state.userStats,
              [currentUser]: {
                ...userStatsMap,
                [word]: { ...current, ...updates },
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      incrementViewCount: (word) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set((state) => {
          const userStatsMap = state.userStats[currentUser] || {};
          const current = userStatsMap[word] || { difficulty: 0, viewCount: 0 };
          
          return {
            userStats: {
              ...state.userStats,
              [currentUser]: {
                ...userStatsMap,
                [word]: { ...current, viewCount: current.viewCount + 1 },
              }
            },
            lastSaved: Date.now(),
          };
        });
      },
      updateLesson: (lessonId, updates) => {
        set((state) => ({
          customLessons: state.customLessons.map((l) =>
            l.id === lessonId ? { ...l, ...updates } : l
          ),
          lastSaved: Date.now(),
        }));
      },
      saveProgress: () => {
        const { currentUser } = get();
        if (currentUser && currentUser !== 'teacher') {
          get().updateStudentActivity(currentUser, {});
        }
        set({ lastSaved: Date.now() });
      },
    }),
    {
      name: 'lexicon-app-storage',
    }
  )
);
