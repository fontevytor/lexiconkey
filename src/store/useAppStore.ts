import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LESSONS, LessonData } from '../data/lessons';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  query, 
  where,
  updateDoc,
  getDoc,
  collectionGroup,
  getDocFromServer
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't throw here to avoid crashing the whole app, but log it clearly
}

interface CustomNote {
  id: string;
  type: 'sentence' | 'qa';
  text: string;
  answer?: string;
}

interface LessonProgress {
  stars: {
    flashcards: boolean;
    phraseUnscramble: boolean;
    hangman: boolean;
    scramble: boolean;
    piano: boolean;
  };
  unlocked: boolean;
  assignmentCompleted?: boolean;
  assignmentAnswers?: string[];
  assignmentGrade?: string;
}

interface VocabularyStats {
  difficulty: number; // 0-10
  viewCount: number;
}

interface StudentAccount {
  username: string;
  password: string;
}

interface GameState {
  phraseUnscramble?: { level: number; score: number };
  scramble?: { level: number };
  hangman?: { level: number };
  piano?: { level: number };
}

interface StudentActivity {
  lessonId: number;
  wordIndex: number;
  lastSaved: number;
  gameProgress: Record<number, GameState>; // Key is lessonId
  streak: number;
  lastActivityAt: number;
  conversationXP: number;
  conversationLevel: number;
  totalConversationTime: number; // in seconds
  conversationTotalScore: number;
  conversationTotalAnswers: number;
}

interface WordOfTheDay {
  word: string;
  translation: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: number;
}

interface Book {
  id: number;
  title: string;
  description: string;
}

interface AppState {
  userType: 'student' | 'teacher' | null;
  currentUser: string | null; // username or 'teacher'
  studentActivity: Record<string, StudentActivity>; // Key is username
  userProgress: Record<string, Record<number, LessonProgress>>; // Key is username
  userNotes: Record<string, Record<string, CustomNote[]>>; // Key 1: username, Key 2: word
  userStats: Record<string, Record<string, VocabularyStats>>; // Key 1: username, Key 2: word
  favoriteCards: Record<string, string[]>; // Key: username, Value: list of words
  memoryMasterScore: Record<string, number>; // Key: username
  wordOfTheDay: Record<string, WordOfTheDay>; // Key: username
  books: Book[];
  customLessons: LessonData[];
  lastSaved: number;
  initialized: boolean;
  setUserType: (type: 'student' | 'teacher' | null) => void;
  setCurrentUser: (username: string | null) => void;
  updateStudentActivity: (username: string, activity: Partial<StudentActivity>) => Promise<void>;
  updateGameProgress: (lessonId: number, game: keyof GameState, progress: any) => Promise<void>;
  completeActivity: (lessonId: number, activity: keyof LessonProgress['stars']) => Promise<void>;
  completeAssignment: (lessonId: number, answers: string[], grade: string) => Promise<void>;
  isLessonUnlocked: (lessonId: number) => boolean;
  getStarsCount: (lessonId: number, username?: string) => number;
  addNote: (word: string, note: Omit<CustomNote, 'id'>) => Promise<void>;
  deleteNote: (word: string, noteId: string) => Promise<void>;
  updateNote: (word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateUserNote: (username: string, word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateVocabStats: (word: string, updates: Partial<VocabularyStats>) => Promise<void>;
  incrementViewCount: (word: string) => Promise<void>;
  updateConversationStats: (xpGain: number, timeGain: number, score?: number) => Promise<void>;
  recordActivity: () => Promise<void>;
  updateBook: (bookId: number, updates: Partial<Book>) => Promise<void>;
  updateLesson: (lessonId: number, updates: Partial<LessonData>) => Promise<void>;
  addLesson: (lesson: LessonData) => Promise<void>;
  deleteLesson: (lessonId: number) => Promise<void>;
  clearAllLessons: () => Promise<void>;
  reorderLessons: (newLessons: LessonData[]) => Promise<void>;
  toggleFavoriteCard: (word: string) => void;
  submitWordOfTheDay: (answer: string) => boolean;
  getWordOfTheDay: () => WordOfTheDay | null;
  saveProgress: () => void;
  resetProgress: () => Promise<void>;
  initFirestore: () => () => void;
  syncUserData: (username: string, isTeacher: boolean) => () => void;
  loginAsTeacher: () => Promise<void>;
  loginAsStudent: (username: string) => Promise<void>;
  exportProgressKey: () => string;
  importProgressKey: (key: string) => boolean;
  voicePreference: 'male' | 'female' | 'random';
  setVoicePreference: (pref: 'male' | 'female' | 'random') => void;
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
      favoriteCards: {},
      memoryMasterScore: {},
      wordOfTheDay: {},
      books: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        description: `Description for Book ${i + 1}`
      })),
      customLessons: LESSONS.map(l => ({ ...l, bookId: l.bookId || 1 })),
      lastSaved: Date.now(),
      initialized: false,
      voicePreference: 'random',
      setUserType: (userType) => set({ userType }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      setVoicePreference: (voicePreference) => set({ voicePreference }),
      
      initFirestore: () => {
        if (get().initialized) return () => {};

        const unsubscribers: (() => void)[] = [];

        // Test connection
        getDocFromServer(doc(db, 'test', 'connection')).catch(err => {
          if (err.message.includes('the client is offline')) {
            console.error("Firebase is offline. Check configuration.");
          }
        });

        // Listen for auth state changes
        const authUnsub = onAuthStateChanged(auth, (user) => {
          set({ initialized: true });
        });
        unsubscribers.push(authUnsub);

        // Sync Books
        unsubscribers.push(onSnapshot(collection(db, 'books'), (snapshot) => {
          if (snapshot.empty) {
            if (auth.currentUser?.email === 'fontevytor@gmail.com') {
              get().books.forEach(b => setDoc(doc(db, 'books', b.id.toString()), b));
            }
          } else {
            const books: Book[] = [];
            snapshot.forEach(doc => books.push(doc.data() as Book));
            set({ books: books.sort((a, b) => a.id - b.id) });
          }
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'books')));

        // Sync Lessons (Publicly readable per rules)
        unsubscribers.push(onSnapshot(collection(db, 'lessons'), (snapshot) => {
          const lessons: LessonData[] = [];
          snapshot.forEach(doc => lessons.push(doc.data() as LessonData));
          set({ customLessons: lessons.sort((a, b) => a.id - b.id) });
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'lessons')));

        return () => unsubscribers.forEach(unsub => unsub());
      },

      syncUserData: (username, isTeacher) => {
        if (!isTeacher) return () => {}; // Students are local-only now

        const unsubscribers: (() => void)[] = [];

        // Helper to wait for auth if needed
        const startSync = () => {
          if (!auth.currentUser) return;

          // Teacher syncs everything
          unsubscribers.push(onSnapshot(collection(db, 'studentActivity'), (snapshot) => {
            const activity: Record<string, StudentActivity> = {};
            snapshot.forEach(doc => activity[doc.id] = doc.data() as StudentActivity);
            set({ studentActivity: activity });
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'studentActivity')));

          unsubscribers.push(onSnapshot(collection(db, 'userProgress'), (snapshot) => {
            snapshot.forEach(async (userDoc) => {
              const uname = userDoc.id;
              const lessonsSnapshot = await getDocs(collection(db, `userProgress/${uname}/lessons`)).catch(err => {
                handleFirestoreError(err, OperationType.LIST, `userProgress/${uname}/lessons`);
                return { forEach: () => {} } as any;
              });
              const progress: Record<number, LessonProgress> = {};
              lessonsSnapshot.forEach((lDoc: any) => progress[Number(lDoc.id)] = lDoc.data() as LessonProgress);
              set(state => ({
                userProgress: { ...state.userProgress, [uname]: progress }
              }));
            });
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'userProgress')));

          unsubscribers.push(onSnapshot(collection(db, 'userNotes'), (snapshot) => {
            snapshot.forEach(async (userDoc) => {
              const uname = userDoc.id;
              const notesSnapshot = await getDocs(collection(db, `userNotes/${uname}/notes`)).catch(err => {
                handleFirestoreError(err, OperationType.LIST, `userNotes/${uname}/notes`);
                return { forEach: () => {} } as any;
              });
              const notes: Record<string, CustomNote[]> = {};
              notesSnapshot.forEach((nDoc: any) => {
                const note = nDoc.data() as CustomNote & { word: string };
                if (!notes[note.word]) notes[note.word] = [];
                notes[note.word].push(note);
              });
              set(state => ({
                userNotes: { ...state.userNotes, [uname]: notes }
              }));
            });
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'userNotes')));

          unsubscribers.push(onSnapshot(collection(db, 'userStats'), (snapshot) => {
            snapshot.forEach(async (userDoc) => {
              const uname = userDoc.id;
              const statsSnapshot = await getDocs(collection(db, `userStats/${uname}/words`)).catch(err => {
                handleFirestoreError(err, OperationType.LIST, `userStats/${uname}/words`);
                return { forEach: () => {} } as any;
              });
              const stats: Record<string, VocabularyStats> = {};
              statsSnapshot.forEach((sDoc: any) => stats[sDoc.id] = sDoc.data() as VocabularyStats);
              set(state => ({
                userStats: { ...state.userStats, [uname]: stats }
              }));
            });
          }, (err) => handleFirestoreError(err, OperationType.LIST, 'userStats')));
        };

        // If already auth, start immediately
        if (auth.currentUser) {
          startSync();
        } else {
          // Otherwise wait for auth
          const authUnsub = onAuthStateChanged(auth, (user) => {
            if (user) {
              startSync();
              authUnsub(); // Only need to trigger once
            }
          });
          unsubscribers.push(authUnsub);
        }

        return () => unsubscribers.forEach(unsub => unsub());
      },

      loginAsTeacher: async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        if (result.user.email === 'fontevytor@gmail.com') {
          set({ userType: 'teacher', currentUser: 'teacher' });
        } else {
          await auth.signOut();
          throw new Error('Unauthorized teacher email');
        }
      },

      loginAsStudent: async (username) => {
        set({ userType: 'student', currentUser: username || 'Student' });
      },

      updateStudentActivity: async (username, activity) => {
        const current = get().studentActivity[username] || { 
          lessonId: 1, 
          wordIndex: 0, 
          lastSaved: Date.now(), 
          gameProgress: {},
          streak: 0,
          lastActivityAt: Date.now(),
          conversationXP: 0,
          conversationLevel: 1,
          totalConversationTime: 0,
          conversationTotalScore: 0,
          conversationTotalAnswers: 0
        };
        const updated = { ...current, ...activity, lastSaved: Date.now() };
        
        set(state => ({
          studentActivity: { ...state.studentActivity, [username]: updated }
        }));

        if (get().userType === 'teacher') {
          await setDoc(doc(db, 'studentActivity', username), updated);
        }
      },

      recordActivity: async () => {
        const { currentUser, studentActivity } = get();
        if (!currentUser || currentUser === 'teacher') return;

        const now = Date.now();
        const current = studentActivity[currentUser] || { 
          lessonId: 1, 
          wordIndex: 0, 
          lastSaved: now, 
          gameProgress: {},
          streak: 0,
          lastActivityAt: now,
          conversationXP: 0,
          conversationLevel: 1,
          totalConversationTime: 0,
          conversationTotalScore: 0,
          conversationTotalAnswers: 0
        };

        const twelveHours = 12 * 60 * 60 * 1000;
        let newStreak = current.streak;

        if (now - current.lastActivityAt > twelveHours) {
          newStreak = 1;
        } else {
          // Only increment if it's been at least 30 minutes since last increment to avoid spam
          if (now - current.lastActivityAt > 30 * 60 * 1000) {
            newStreak += 1;
          } else if (newStreak === 0) {
            newStreak = 1;
          }
        }

        await get().updateStudentActivity(currentUser, { 
          streak: newStreak, 
          lastActivityAt: now 
        });
      },

      updateGameProgress: async (lessonId, game, progress) => {
        const { currentUser, studentActivity } = get();
        if (!currentUser) return;

        const currentActivity = studentActivity[currentUser] || { 
          lessonId, 
          wordIndex: 0, 
          gameProgress: {}, 
          lastSaved: Date.now(),
          streak: 0,
          lastActivityAt: Date.now(),
          conversationXP: 0,
          conversationLevel: 1,
          totalConversationTime: 0,
          conversationTotalScore: 0,
          conversationTotalAnswers: 0
        };
        const lessonProgress = currentActivity.gameProgress[lessonId] || {};
        
        set(state => ({
          studentActivity: {
            ...state.studentActivity,
            [currentUser]: {
              ...currentActivity,
              gameProgress: {
                ...currentActivity.gameProgress,
                [lessonId]: {
                  ...lessonProgress,
                  [game]: progress
                }
              },
              lastSaved: Date.now()
            }
          }
        }));
      },

      completeActivity: async (lessonId, activity) => {
        const { currentUser, customLessons } = get();
        if (!currentUser) return;

        const currentProgressMap = get().userProgress[currentUser] || {};
        const currentProgress = currentProgressMap[lessonId] || {
          stars: { flashcards: false, phraseUnscramble: false, hangman: false, scramble: false, piano: false },
          unlocked: false,
        };

        const newStars = { ...currentProgress.stars, [activity]: true };
        const newLessonProgress = { ...currentProgress, stars: newStars };
        
        const newUserProgress = { ...currentProgressMap, [lessonId]: newLessonProgress };

        // Check if next lesson should be unlocked
        const starsCount = Object.values(newStars).filter(Boolean).length;
        if (starsCount >= 4) {
          const lesson = customLessons.find(l => l.id === lessonId);
          if (lesson) {
            const bookLessons = customLessons
              .filter(l => l.bookId === lesson.bookId)
              .sort((a, b) => a.id - b.id);
            const currentIndex = bookLessons.findIndex(l => l.id === lessonId);
            const nextLesson = bookLessons[currentIndex + 1];
            
            if (nextLesson) {
              const nextId = nextLesson.id;
              if (!newUserProgress[nextId]) {
                newUserProgress[nextId] = {
                  stars: { flashcards: false, phraseUnscramble: false, hangman: false, scramble: false, piano: false },
                  unlocked: true,
                };
              } else {
                newUserProgress[nextId] = { ...newUserProgress[nextId], unlocked: true };
              }

              if (get().userType === 'teacher') {
                await setDoc(doc(db, `userProgress/${currentUser}/lessons`, nextId.toString()), newUserProgress[nextId]);
              }
            }
          }
        }

        set(state => ({
          userProgress: { ...state.userProgress, [currentUser]: newUserProgress }
        }));

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userProgress/${currentUser}/lessons`, lessonId.toString()), newLessonProgress);
        }
      },

      completeAssignment: async (lessonId, answers, grade) => {
        const { currentUser, customLessons } = get();
        if (!currentUser) return;

        const currentProgressMap = get().userProgress[currentUser] || {};
        const currentProgress = currentProgressMap[lessonId] || {
          stars: { flashcards: false, phraseUnscramble: false, hangman: false, scramble: false, piano: false },
          unlocked: false,
        };

        const newLessonProgress = { 
          ...currentProgress, 
          assignmentCompleted: true,
          assignmentAnswers: answers,
          assignmentGrade: grade
        };
        
        set(state => ({
          userProgress: { 
            ...state.userProgress, 
            [currentUser]: { ...currentProgressMap, [lessonId]: newLessonProgress } 
          }
        }));

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userProgress/${currentUser}/lessons`, lessonId.toString()), newLessonProgress);
        }
      },

      isLessonUnlocked: (lessonId) => {
        const { currentUser, userProgress, customLessons } = get();
        if (!currentUser || currentUser === 'teacher') return true;

        const lesson = customLessons.find(l => l.id === lessonId);
        if (!lesson) return false;

        // First lesson of any book is always unlocked
        const bookLessons = customLessons
          .filter(l => l.bookId === lesson.bookId)
          .sort((a, b) => a.id - b.id);
        
        if (bookLessons[0]?.id === lessonId) return true;

        // Otherwise check if explicitly unlocked
        return userProgress[currentUser]?.[lessonId]?.unlocked || false;
      },

      getStarsCount: (lessonId, username) => {
        const { currentUser, userProgress } = get();
        const targetUser = username || currentUser;
        if (!targetUser || targetUser === 'teacher') return 0;
        const p = userProgress[targetUser]?.[lessonId];
        if (!p || !p.stars) return 0;
        return Object.values(p.stars).filter(Boolean).length;
      },

      addNote: async (word, note) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const id = Math.random().toString(36).substring(7);
        const newNote = { ...note, id, word };
        
        set(state => {
          const userNotes = state.userNotes[currentUser] || {};
          const wordNotes = userNotes[word] || [];
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotes,
                [word]: [...wordNotes, newNote]
              }
            }
          };
        });

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userNotes/${currentUser}/notes`, id), newNote);
        }
      },

      deleteNote: async (word, noteId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => {
          const userNotes = state.userNotes[currentUser] || {};
          const wordNotes = userNotes[word] || [];
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotes,
                [word]: wordNotes.filter(n => n.id !== noteId)
              }
            }
          };
        });

        if (get().userType === 'teacher') {
          await deleteDoc(doc(db, `userNotes/${currentUser}/notes`, noteId));
        }
      },

      updateNote: async (word, noteId, updates) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => {
          const userNotes = state.userNotes[currentUser] || {};
          const wordNotes = userNotes[word] || [];
          return {
            userNotes: {
              ...state.userNotes,
              [currentUser]: {
                ...userNotes,
                [word]: wordNotes.map(n => n.id === noteId ? { ...n, ...updates } : n)
              }
            }
          };
        });

        if (get().userType === 'teacher') {
          await updateDoc(doc(db, `userNotes/${currentUser}/notes`, noteId), updates);
        }
      },

      updateUserNote: async (username, word, noteId, updates) => {
        set(state => {
          const userNotes = state.userNotes[username] || {};
          const wordNotes = userNotes[word] || [];
          return {
            userNotes: {
              ...state.userNotes,
              [username]: {
                ...userNotes,
                [word]: wordNotes.map(n => n.id === noteId ? { ...n, ...updates } : n)
              }
            }
          };
        });
        await updateDoc(doc(db, `userNotes/${username}/notes`, noteId), updates);
      },

      updateVocabStats: async (word, updates) => {
        const { currentUser } = get();
        if (!currentUser) return;
        const current = get().userStats[currentUser]?.[word] || { difficulty: 0, viewCount: 0 };
        const updated = { ...current, ...updates };

        set(state => ({
          userStats: {
            ...state.userStats,
            [currentUser]: {
              ...(state.userStats[currentUser] || {}),
              [word]: updated
            }
          }
        }));

        await get().recordActivity();

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userStats/${currentUser}/words`, word), updated);
        }
      },

      incrementViewCount: async (word) => {
        const { currentUser } = get();
        if (!currentUser) return;
        const current = get().userStats[currentUser]?.[word] || { difficulty: 0, viewCount: 0 };
        const updated = { ...current, viewCount: current.viewCount + 1 };

        set(state => ({
          userStats: {
            ...state.userStats,
            [currentUser]: {
              ...(state.userStats[currentUser] || {}),
              [word]: updated
            }
          }
        }));

        await get().recordActivity();

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userStats/${currentUser}/words`, word), updated);
        }
      },

      updateConversationStats: async (xpGain, timeGain, score) => {
        const { currentUser, studentActivity } = get();
        if (!currentUser || currentUser === 'teacher') return;

        const current = studentActivity[currentUser] || {
          lessonId: 1,
          wordIndex: 0,
          lastSaved: Date.now(),
          gameProgress: {},
          streak: 0,
          lastActivityAt: Date.now(),
          conversationXP: 0,
          conversationLevel: 1,
          totalConversationTime: 0,
          conversationTotalScore: 0,
          conversationTotalAnswers: 0
        };

        // Ensure defaults for existing objects that might lack these fields
        const xp = current.conversationXP ?? 0;
        const level = current.conversationLevel ?? 1;
        const totalTime = current.totalConversationTime ?? 0;
        const totalScore = current.conversationTotalScore ?? 0;
        const totalAnswers = current.conversationTotalAnswers ?? 0;

        let newXP = xp + xpGain;
        let newLevel = level;
        
        // Level up logic: 100 XP per level
        const xpPerLevel = 100;
        while (newXP >= xpPerLevel) {
          newXP -= xpPerLevel;
          newLevel += 1;
        }

        const updates: Partial<StudentActivity> = {
          conversationXP: newXP,
          conversationLevel: newLevel,
          totalConversationTime: totalTime + timeGain
        };

        if (score !== undefined) {
          updates.conversationTotalScore = totalScore + score;
          updates.conversationTotalAnswers = totalAnswers + 1;
        }

        await get().updateStudentActivity(currentUser, updates);
      },

      updateBook: async (bookId, updates) => {
        set(state => ({
          books: state.books.map(b => b.id === bookId ? { ...b, ...updates } : b)
        }));
        try {
          await updateDoc(doc(db, 'books', bookId.toString()), updates);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `books/${bookId}`);
        }
      },

      updateLesson: async (lessonId, updates) => {
        // Update local state immediately for responsiveness
        set(state => ({
          customLessons: state.customLessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
        }));

        // Update Firestore
        try {
          await updateDoc(doc(db, 'lessons', lessonId.toString()), updates);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}`);
        }
      },

      addLesson: async (lesson) => {
        set(state => ({
          customLessons: [...state.customLessons, lesson]
        }));

        try {
          await setDoc(doc(db, 'lessons', lesson.id.toString()), lesson);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `lessons/${lesson.id}`);
        }
      },

      deleteLesson: async (lessonId) => {
        set(state => ({
          customLessons: state.customLessons.filter(l => l.id !== lessonId)
        }));
        try {
          await deleteDoc(doc(db, 'lessons', lessonId.toString()));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `lessons/${lessonId}`);
        }
      },

      clearAllLessons: async () => {
        const { customLessons } = get();
        const promises = customLessons.map(lesson => 
          deleteDoc(doc(db, 'lessons', lesson.id.toString()))
        );
        try {
          await Promise.all(promises);
          await deleteDoc(doc(db, 'metadata', 'lessonOrder'));
          set({ customLessons: [] });
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'lessons/all');
        }
      },

      reorderLessons: async (newLessons) => {
        set({ customLessons: newLessons });
        
        // In a real app we might update a 'order' field, but here we'll just update all if needed
        // or assume the list is fetched and sorted by an order field.
        // For simplicity, we'll just update the local state and maybe a metadata doc in firestore.
        try {
          await setDoc(doc(db, 'metadata', 'lessonOrder'), { order: newLessons.map(l => l.id) });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'metadata/lessonOrder');
        }
      },

      toggleFavoriteCard: (word) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set(state => {
          const userFavorites = state.favoriteCards[currentUser] || [];
          const isFavorite = userFavorites.includes(word);
          const newFavorites = isFavorite 
            ? userFavorites.filter(w => w !== word)
            : [...userFavorites, word];
          
          return {
            favoriteCards: {
              ...state.favoriteCards,
              [currentUser]: newFavorites
            }
          };
        });
      },

      getWordOfTheDay: () => {
        const { currentUser, wordOfTheDay, customLessons, userProgress } = get();
        if (!currentUser) return null;

        const now = Date.now();
        const current = wordOfTheDay[currentUser];

        if (current) {
          if (current.completed) {
            const elapsed = now - (current.completedAt || 0);
            if (elapsed < 24 * 60 * 60 * 1000) {
              return current;
            }
          } else {
            return current;
          }
        }

        // Pick a new word from unlocked lessons (Lesson 1 is always unlocked)
        const unlockedLessonIds = [1];
        Object.entries(userProgress[currentUser] || {}).forEach(([id, p]) => {
          if (p.unlocked) unlockedLessonIds.push(Number(id));
        });
        
        const availableWords = customLessons
          .filter(l => unlockedLessonIds.includes(l.id))
          .flatMap(l => l.vocabulary);

        if (availableWords.length === 0) return null;

        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        const newWotd: WordOfTheDay = {
          word: randomWord.word,
          translation: randomWord.translation,
          date: new Date().toISOString().split('T')[0],
          completed: false
        };

        set(state => ({
          wordOfTheDay: {
            ...state.wordOfTheDay,
            [currentUser]: newWotd
          }
        }));

        return newWotd;
      },

      submitWordOfTheDay: (answer) => {
        const { currentUser, wordOfTheDay, memoryMasterScore } = get();
        if (!currentUser) return false;

        const current = wordOfTheDay[currentUser];
        if (!current || current.completed) return false;

        const isCorrect = answer.toLowerCase().trim() === current.translation.toLowerCase().trim();

        if (isCorrect) {
          set(state => ({
            wordOfTheDay: {
              ...state.wordOfTheDay,
              [currentUser]: { ...current, completed: true, completedAt: Date.now() }
            },
            memoryMasterScore: {
              ...state.memoryMasterScore,
              [currentUser]: (state.memoryMasterScore[currentUser] || 0) + 1
            }
          }));
        }

        return isCorrect;
      },

      saveProgress: () => {
        const { currentUser } = get();
        if (currentUser && currentUser !== 'teacher') {
          get().updateStudentActivity(currentUser, {});
        }
      },
      resetProgress: async () => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        set(state => {
          const newStudentActivity = { ...state.studentActivity };
          delete newStudentActivity[currentUser];

          const newUserProgress = { ...state.userProgress };
          delete newUserProgress[currentUser];

          const newUserNotes = { ...state.userNotes };
          delete newUserNotes[currentUser];

          const newUserStats = { ...state.userStats };
          delete newUserStats[currentUser];

          const newFavoriteCards = { ...state.favoriteCards };
          delete newFavoriteCards[currentUser];

          const newMemoryMasterScore = { ...state.memoryMasterScore };
          delete newMemoryMasterScore[currentUser];

          const newWordOfTheDay = { ...state.wordOfTheDay };
          delete newWordOfTheDay[currentUser];

          return {
            studentActivity: newStudentActivity,
            userProgress: newUserProgress,
            userNotes: newUserNotes,
            userStats: newUserStats,
            favoriteCards: newFavoriteCards,
            memoryMasterScore: newMemoryMasterScore,
            wordOfTheDay: newWordOfTheDay,
          };
        });

        // If teacher mode is on, we should also delete from Firestore
        if (get().userType === 'teacher') {
          try {
            await deleteDoc(doc(db, 'studentActivity', currentUser));
            // Note: Deleting subcollections in Firestore requires a recursive delete or deleting each doc.
            // For simplicity in this local-first app, we'll focus on the local reset.
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `studentActivity/${currentUser}`);
          }
        }
      },

      exportProgressKey: () => {
        const state = get();
        const data = {
          studentActivity: state.studentActivity,
          userProgress: state.userProgress,
          userNotes: state.userNotes,
          userStats: state.userStats,
          favoriteCards: state.favoriteCards,
          memoryMasterScore: state.memoryMasterScore,
          wordOfTheDay: state.wordOfTheDay,
          lastSaved: Date.now()
        };
        try {
          const json = JSON.stringify(data);
          // Use btoa with encodeURIComponent for UTF-8 support
          return btoa(unescape(encodeURIComponent(json)));
        } catch (e) {
          console.error('Export failed', e);
          return '';
        }
      },

      importProgressKey: (key: string) => {
        try {
          const json = decodeURIComponent(escape(atob(key)));
          const data = JSON.parse(json);
          
          // Basic validation
          if (!data.studentActivity || !data.userProgress) return false;

          set(state => ({
            ...state,
            studentActivity: { ...state.studentActivity, ...data.studentActivity },
            userProgress: { ...state.userProgress, ...data.userProgress },
            userNotes: { ...state.userNotes, ...data.userNotes },
            userStats: { ...state.userStats, ...data.userStats },
            favoriteCards: { ...state.favoriteCards, ...data.favoriteCards },
            memoryMasterScore: { ...state.memoryMasterScore, ...data.memoryMasterScore },
            wordOfTheDay: { ...state.wordOfTheDay, ...data.wordOfTheDay },
            lastSaved: Date.now()
          }));
          return true;
        } catch (e) {
          console.error('Import failed', e);
          return false;
        }
      },
    }),
    {
      name: 'lexicon-app-storage',
      partialize: (state) => ({
        userType: state.userType,
        currentUser: state.currentUser,
        studentActivity: state.studentActivity,
        userProgress: state.userProgress,
        userNotes: state.userNotes,
        userStats: state.userStats,
        favoriteCards: state.favoriteCards,
        memoryMasterScore: state.memoryMasterScore,
        wordOfTheDay: state.wordOfTheDay,
      }),
    }
  )
);
