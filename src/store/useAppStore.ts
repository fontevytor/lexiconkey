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
  collectionGroup
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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
  initialized: boolean;
  setUserType: (type: 'student' | 'teacher' | null) => void;
  setCurrentUser: (username: string | null) => void;
  addStudent: (student: StudentAccount) => Promise<void>;
  deleteStudent: (username: string) => Promise<void>;
  updateStudentActivity: (username: string, activity: Partial<StudentActivity>) => Promise<void>;
  completeActivity: (lessonId: number, activity: keyof LessonProgress['stars']) => Promise<void>;
  isLessonUnlocked: (lessonId: number) => boolean;
  getStarsCount: (lessonId: number, username?: string) => number;
  addNote: (word: string, note: Omit<CustomNote, 'id'>) => Promise<void>;
  deleteNote: (word: string, noteId: string) => Promise<void>;
  updateNote: (word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateUserNote: (username: string, word: string, noteId: string, updates: Partial<CustomNote>) => Promise<void>;
  updateVocabStats: (word: string, updates: Partial<VocabularyStats>) => Promise<void>;
  incrementViewCount: (word: string) => Promise<void>;
  updateLesson: (lessonId: number, updates: Partial<LessonData>) => Promise<void>;
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
      customLessons: LESSONS,
      lastSaved: Date.now(),
      initialized: false,
      setUserType: (userType) => set({ userType }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      
      initFirestore: () => {
        if (get().initialized) return () => {};

        const unsubscribers: (() => void)[] = [];

        // Listen for auth state changes
        const authUnsub = onAuthStateChanged(auth, (user) => {
          // If we have a user, we might need to re-sync or just update state
          // But we don't trigger syncUserData here, App.tsx handles it
          set({ initialized: true });
        });
        unsubscribers.push(authUnsub);

        // Sync Student Accounts (Publicly readable per rules)
        unsubscribers.push(onSnapshot(collection(db, 'studentAccounts'), (snapshot) => {
          const accounts: StudentAccount[] = [];
          snapshot.forEach(doc => accounts.push(doc.data() as StudentAccount));
          set({ studentAccounts: accounts });
        }));

        // Sync Lessons (Publicly readable per rules)
        unsubscribers.push(onSnapshot(collection(db, 'lessons'), (snapshot) => {
          if (snapshot.empty) {
            LESSONS.forEach(l => setDoc(doc(db, 'lessons', l.id.toString()), l));
          } else {
            const lessons: LessonData[] = [];
            snapshot.forEach(doc => lessons.push(doc.data() as LessonData));
            set({ customLessons: lessons.sort((a, b) => a.id - b.id) });
          }
        }));

        return () => unsubscribers.forEach(unsub => unsub());
      },

      syncUserData: (username, isTeacher) => {
        const unsubscribers: (() => void)[] = [];

        // Helper to wait for auth if needed
        const startSync = () => {
          if (!auth.currentUser) return;

          if (isTeacher) {
            // Teacher syncs everything
            unsubscribers.push(onSnapshot(collection(db, 'studentActivity'), (snapshot) => {
              const activity: Record<string, StudentActivity> = {};
              snapshot.forEach(doc => activity[doc.id] = doc.data() as StudentActivity);
              set({ studentActivity: activity });
            }));

            unsubscribers.push(onSnapshot(collection(db, 'userProgress'), (snapshot) => {
              snapshot.forEach(async (userDoc) => {
                const uname = userDoc.id;
                const lessonsSnapshot = await getDocs(collection(db, `userProgress/${uname}/lessons`));
                const progress: Record<number, LessonProgress> = {};
                lessonsSnapshot.forEach(lDoc => progress[Number(lDoc.id)] = lDoc.data() as LessonProgress);
                set(state => ({
                  userProgress: { ...state.userProgress, [uname]: progress }
                }));
              });
            }));

            unsubscribers.push(onSnapshot(collection(db, 'userNotes'), (snapshot) => {
              snapshot.forEach(async (userDoc) => {
                const uname = userDoc.id;
                const notesSnapshot = await getDocs(collection(db, `userNotes/${uname}/notes`));
                const notes: Record<string, CustomNote[]> = {};
                notesSnapshot.forEach(nDoc => {
                  const note = nDoc.data() as CustomNote & { word: string };
                  if (!notes[note.word]) notes[note.word] = [];
                  notes[note.word].push(note);
                });
                set(state => ({
                  userNotes: { ...state.userNotes, [uname]: notes }
                }));
              });
            }));

            unsubscribers.push(onSnapshot(collection(db, 'userStats'), (snapshot) => {
              snapshot.forEach(async (userDoc) => {
                const uname = userDoc.id;
                const statsSnapshot = await getDocs(collection(db, `userStats/${uname}/words`));
                const stats: Record<string, VocabularyStats> = {};
                statsSnapshot.forEach(sDoc => stats[sDoc.id] = sDoc.data() as VocabularyStats);
                set(state => ({
                  userStats: { ...state.userStats, [uname]: stats }
                }));
              });
            }));
          } else {
            // Student syncs only their own data
            unsubscribers.push(onSnapshot(doc(db, 'studentActivity', username), (doc) => {
              if (doc.exists()) {
                set(state => ({
                  studentActivity: { ...state.studentActivity, [username]: doc.data() as StudentActivity }
                }));
              }
            }));

            unsubscribers.push(onSnapshot(collection(db, `userProgress/${username}/lessons`), (snapshot) => {
              const progress: Record<number, LessonProgress> = {};
              snapshot.forEach(lDoc => progress[Number(lDoc.id)] = lDoc.data() as LessonProgress);
              set(state => ({
                userProgress: { ...state.userProgress, [username]: progress }
              }));
            }));

            unsubscribers.push(onSnapshot(collection(db, `userNotes/${username}/notes`), (snapshot) => {
              const notes: Record<string, CustomNote[]> = {};
              snapshot.forEach(nDoc => {
                const note = nDoc.data() as CustomNote & { word: string };
                if (!notes[note.word]) notes[note.word] = [];
                notes[note.word].push(note);
              });
              set(state => ({
                userNotes: { ...state.userNotes, [username]: notes }
              }));
            }));

            unsubscribers.push(onSnapshot(collection(db, `userStats/${username}/words`), (snapshot) => {
              const stats: Record<string, VocabularyStats> = {};
              snapshot.forEach(sDoc => stats[sDoc.id] = sDoc.data() as VocabularyStats);
              set(state => ({
                userStats: { ...state.userStats, [username]: stats }
              }));
            }));
          }
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
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch (err: any) {
          if (err.code === 'auth/admin-restricted-operation') {
            throw new Error('Anonymous authentication is disabled in Firebase Console. Please enable it or contact the administrator.');
          }
          throw err;
        }
        
        const uid = auth.currentUser?.uid;
        if (uid) {
          await updateDoc(doc(db, 'studentAccounts', username), { uid });
        }
        set({ userType: 'student', currentUser: username });
      },

      addStudent: async (student) => {
        await setDoc(doc(db, 'studentAccounts', student.username), student);
      },

      deleteStudent: async (username) => {
        await deleteDoc(doc(db, 'studentAccounts', username));
        await deleteDoc(doc(db, 'studentActivity', username));
        // Note: Deleting subcollections requires more logic, usually done via Cloud Functions or recursive deletes
        // For now we just delete the main docs
      },

      updateStudentActivity: async (username, activity) => {
        const current = get().studentActivity[username] || { lessonId: 1, wordIndex: 0, lastSaved: Date.now() };
        const updated = { ...current, ...activity, lastSaved: Date.now() };
        await setDoc(doc(db, 'studentActivity', username), updated);
      },

      completeActivity: async (lessonId, activity) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        const currentProgressMap = get().userProgress[currentUser] || {
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
        
        await setDoc(doc(db, `userProgress/${currentUser}/lessons`, lessonId.toString()), newLessonProgress);

        // Check if next lesson should be unlocked
        const starsCount = Object.values(newStars).filter(Boolean).length;
        if (starsCount >= 4) {
          const nextId = lessonId + 1;
          const nextProgressDoc = await getDoc(doc(db, `userProgress/${currentUser}/lessons`, nextId.toString()));
          if (!nextProgressDoc.exists()) {
            await setDoc(doc(db, `userProgress/${currentUser}/lessons`, nextId.toString()), {
              stars: { flashcards: false, bubble: false, hangman: false, battleship: false, piano: false },
              unlocked: true,
            });
          } else {
            await updateDoc(doc(db, `userProgress/${currentUser}/lessons`, nextId.toString()), { unlocked: true });
          }
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
        if (!p) return 0;
        return Object.values(p.stars).filter(Boolean).length;
      },

      addNote: async (word, note) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;

        const id = Math.random().toString(36).substring(7);
        const newNote = { ...note, id, word };
        await setDoc(doc(db, `userNotes/${currentUser}/notes`, id), newNote);
      },

      deleteNote: async (word, noteId) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;
        await deleteDoc(doc(db, `userNotes/${currentUser}/notes`, noteId));
      },

      updateNote: async (word, noteId, updates) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;
        await updateDoc(doc(db, `userNotes/${currentUser}/notes`, noteId), updates);
      },

      updateUserNote: async (username, word, noteId, updates) => {
        await updateDoc(doc(db, `userNotes/${username}/notes`, noteId), updates);
      },

      updateVocabStats: async (word, updates) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;
        const current = get().userStats[currentUser]?.[word] || { difficulty: 0, viewCount: 0 };
        await setDoc(doc(db, `userStats/${currentUser}/words`, word), { ...current, ...updates });
      },

      incrementViewCount: async (word) => {
        const { currentUser } = get();
        if (!currentUser || currentUser === 'teacher') return;
        const current = get().userStats[currentUser]?.[word] || { difficulty: 0, viewCount: 0 };
        await setDoc(doc(db, `userStats/${currentUser}/words`, word), { ...current, viewCount: current.viewCount + 1 });
      },

      updateLesson: async (lessonId, updates) => {
        await updateDoc(doc(db, 'lessons', lessonId.toString()), updates);
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
      }),
    }
  )
);
