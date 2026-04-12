export interface Vocabulary {
  word: string;
  translation: string;
  type?: 'noun' | 'verb' | 'adjective' | 'other';
}

export interface AssignmentQuestion {
  question: string;
  answer: string;
}

export interface LessonData {
  id: number;
  title: string;
  subtitle?: string;
  vocabulary: Vocabulary[];
  phrases: string[];
  assignments?: AssignmentQuestion[];
  verbs?: Vocabulary[];
}

const DEFAULT_ASSIGNMENTS: AssignmentQuestion[] = Array.from({ length: 10 }, (_, i) => ({
  question: `Extra Question ${i + 1}`,
  answer: `Answer ${i + 1}`,
}));

export const LESSONS: LessonData[] = [
  {
    id: 1,
    title: "Fruits & Basics",
    vocabulary: [
      { word: "MANGO", translation: "Manga", type: 'noun' },
      { word: "APPLE", translation: "Maçã", type: 'noun' },
      { word: "BANANA", translation: "Banana", type: 'noun' },
      { word: "ORANGE", translation: "Laranja", type: 'noun' },
      { word: "GRAPE", translation: "Uva", type: 'noun' },
      { word: "WATERMELON", translation: "Melancia", type: 'noun' },
      { word: "PINEAPPLE", translation: "Abacaxi", type: 'noun' },
      { word: "STRAWBERRY", translation: "Morango", type: 'noun' },
      { word: "PEACH", translation: "Pêssego", type: 'noun' },
      { word: "CHERRY", translation: "Cereja", type: 'noun' },
    ],
    verbs: [
      { word: "EAT", translation: "Comer", type: 'verb' },
      { word: "DRINK", translation: "Beber", type: 'verb' },
      { word: "COOK", translation: "Cozinhar", type: 'verb' },
    ],
    phrases: [
      "I LIKE TO EAT MANGO",
      "THE APPLE IS RED",
      "BANANAS ARE YELLOW",
      "DO YOU WANT AN ORANGE",
      "GRAPES ARE SWEET",
      "WATERMELON IS REFRESHING",
      "PINEAPPLE IS SOUR",
      "I LOVE STRAWBERRIES",
      "THE PEACH IS SOFT",
      "CHERRY ON TOP",
    ],
    assignments: DEFAULT_ASSIGNMENTS,
  },
  {
    id: 2,
    title: "Colors & Shapes",
    vocabulary: [
      { word: "RED", translation: "Vermelho" },
      { word: "BLUE", translation: "Azul" },
      { word: "GREEN", translation: "Verde" },
      { word: "YELLOW", translation: "Amarelo" },
      { word: "CIRCLE", translation: "Círculo" },
      { word: "SQUARE", translation: "Quadrado" },
      { word: "TRIANGLE", translation: "Triângulo" },
      { word: "PURPLE", translation: "Roxo" },
      { word: "ORANGE_COLOR", translation: "Laranja" },
      { word: "PINK", translation: "Rosa" },
    ],
    phrases: [
      "THE SKY IS BLUE",
      "THE GRASS IS GREEN",
      "A SQUARE HAS FOUR SIDES",
      "THE SUN IS YELLOW",
      "I HAVE A RED BALL",
      "DRAW A CIRCLE",
      "THE TRIANGLE IS SHARP",
      "PURPLE IS MY FAVORITE",
      "ORANGE IS A FRUIT AND COLOR",
      "PINK FLOWERS ARE PRETTY",
    ],
    assignments: DEFAULT_ASSIGNMENTS,
  },
  ...Array.from({ length: 28 }, (_, i) => ({
    id: i + 3,
    title: `Lesson ${i + 3}`,
    vocabulary: [
      { word: `WORD${i + 3}A`, translation: `TRADUÇÃO${i + 3}A` },
      { word: `WORD${i + 3}B`, translation: `TRADUÇÃO${i + 3}B` },
    ],
    phrases: [
      `PHRASE FOR LESSON ${i + 3} ONE`,
      `PHRASE FOR LESSON ${i + 3} TWO`,
    ],
    assignments: DEFAULT_ASSIGNMENTS,
  }))
];
