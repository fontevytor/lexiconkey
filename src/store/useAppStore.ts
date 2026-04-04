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
    bubble: boolean;
    hangman: boolean;
    scramble: boolean;
    piano: boolean;
  };
  unlocked: boolean;
  assignmentCompleted?: boolean;
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
  bubble?: { level: number; score: number };
  scramble?: { level: number };
  hangman?: { level: number };
  piano?: { level: number };
}

interface StudentActivity {
  lessonId: number;
  wordIndex: number;
  lastSaved: number;
  gameProgress: Record<number, GameState>; // Key is lessonId
}

interface WordOfTheDay {
  word: string;
  translation: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
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
  customLessons: LessonData[];
  lastSaved: number;
  initialized: boolean;
  setUserType: (type: 'student' | 'teacher' | null) => void;
  setCurrentUser: (username: string | null) => void;
  updateStudentActivity: (username: string, activity: Partial<StudentActivity>) => Promise<void>;
  updateGameProgress: (lessonId: number, game: keyof GameState, progress: any) => Promise<void>;
  completeActivity: (lessonId: number, activity: keyof LessonProgress['stars']) => Promise<void>;
  completeAssignment: (lessonId: number) => Promise<void>;
  isLessonUnlocked: (lessonId: number) => boolean;
  getStarsCount: (lessonId: number, username?: string) => number;
  addNote: (word: string, note: Omit<CustomNote, 'id'>) => Promise<void>;
  deleteNote: (word: string, noteId: string) => Promise<void>;
  updateNote: (word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateUserNote: (username: string, word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateVocabStats: (word: string, updates: Partial<VocabularyStats>) => Promise<void>;
  incrementViewCount: (word: string) => Promise<void>;
  updateLesson: (lessonId: number, updates: Partial<LessonData>) => Promise<void>;
  addLesson: (lesson: LessonData) => Promise<void>;
  reorderLessons: (newLessons: LessonData[]) => Promise<void>;
  toggleFavoriteCard: (word: string) => void;
  submitWordOfTheDay: (answer: string) => boolean;
  getWordOfTheDay: () => WordOfTheDay | null;
  saveProgress: () => void;
  initFirestore: () => () => void;
  syncUserData: (username: string, isTeacher: boolean) => () => void;
  loginAsTeacher: () => Promise<void>;
  loginAsStudent: (username: string) => Promise<void>;
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
      customLessons: LESSONS,
      lastSaved: Date.now(),
      initialized: false,
      setUserType: (userType) => set({ userType }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      
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

        // Sync Lessons (Publicly readable per rules)
        unsubscribers.push(onSnapshot(collection(db, 'lessons'), (snapshot) => {
          if (snapshot.empty) {
            // Only initialize if we are the teacher
            if (auth.currentUser?.email === 'fontevytor@gmail.com') {
              LESSONS.forEach(l => setDoc(doc(db, 'lessons', l.id.toString()), l).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `lessons/${l.id}`);
              }));
            }
          } else {
            const lessons: LessonData[] = [];
            snapshot.forEach(doc => lessons.push(doc.data() as LessonData));
            set({ customLessons: lessons.sort((a, b) => a.id - b.id) });
          }
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
        const current = get().studentActivity[username] || { lessonId: 1, wordIndex: 0, lastSaved: Date.now(), gameProgress: {} };
        const updated = { ...current, ...activity, lastSaved: Date.now() };
        
        set(state => ({
          studentActivity: { ...state.studentActivity, [username]: updated }
        }));

        if (get().userType === 'teacher') {
          await setDoc(doc(db, 'studentActivity', username), updated);
        }
      },

      updateGameProgress: async (lessonId, game, progress) => {
        const { currentUser, studentActivity } = get();
        if (!currentUser) return;

        const currentActivity = studentActivity[currentUser] || { lessonId, wordIndex: 0, gameProgress: {}, lastSaved: Date.now() };
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
        const { currentUser } = get();
        if (!currentUser) return;

        const currentProgressMap = get().userProgress[currentUser] || {
          1: {
            stars: { flashcards: false, bubble: false, hangman: false, scramble: false, piano: false },
            unlocked: true,
          }
        };
        
        const currentProgress = currentProgressMap[lessonId] || {
          stars: { flashcards: false, bubble: false, hangman: false, scramble: false, piano: false },
          unlocked: lessonId === 1,
        };

        const newStars = { ...currentProgress.stars, [activity]: true };
        const newLessonProgress = { ...currentProgress, stars: newStars };
        
        const newUserProgress = { ...currentProgressMap, [lessonId]: newLessonProgress };

        // Check if next lesson should be unlocked
        const starsCount = Object.values(newStars).filter(Boolean).length;
        if (starsCount >= 4) {
          const nextId = lessonId + 1;
          if (!newUserProgress[nextId]) {
            newUserProgress[nextId] = {
              stars: { flashcards: false, bubble: false, hangman: false, scramble: false, piano: false },
              unlocked: true,
            };
          } else {
            newUserProgress[nextId] = { ...newUserProgress[nextId], unlocked: true };
          }
        }

        set(state => ({
          userProgress: { ...state.userProgress, [currentUser]: newUserProgress }
        }));

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userProgress/${currentUser}/lessons`, lessonId.toString()), newLessonProgress);
          if (starsCount >= 4) {
            const nextId = lessonId + 1;
            await setDoc(doc(db, `userProgress/${currentUser}/lessons`, nextId.toString()), newUserProgress[nextId]);
          }
        }
      },

      completeAssignment: async (lessonId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const currentProgressMap = get().userProgress[currentUser] || {};
        const currentProgress = currentProgressMap[lessonId] || {
          stars: { flashcards: false, bubble: false, hangman: false, scramble: false, piano: false },
          unlocked: lessonId === 1,
        };

        const newLessonProgress = { ...currentProgress, assignmentCompleted: true };
        
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
        if (lessonId === 1) return true;
        const { currentUser, userProgress } = get();
        if (!currentUser || currentUser === 'teacher') return true;
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

        if (get().userType === 'teacher') {
          await setDoc(doc(db, `userStats/${currentUser}/words`, word), updated);
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

        const today = new Date().toISOString().split('T')[0];
        const current = wordOfTheDay[currentUser];

        if (current && current.date === today) {
          return current;
        }

        // Pick a new word from unlocked lessons
        const unlockedLessonIds = Object.entries(userProgress[currentUser] || {})
          .filter(([_, p]) => p.unlocked)
          .map(([id]) => Number(id));
        
        const availableWords = customLessons
          .filter(l => unlockedLessonIds.includes(l.id))
          .flatMap(l => l.vocabulary);

        if (availableWords.length === 0) return null;

        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        const newWotd: WordOfTheDay = {
          word: randomWord.word,
          translation: randomWord.translation,
          date: today,
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
              [currentUser]: { ...current, completed: true }
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
