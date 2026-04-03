export interface Vocabulary {
  word: string;
  translation: string;
}

export interface LessonData {
  id: number;
  title: string;
  vocabulary: Vocabulary[];
  phrases: string[];
}

export const LESSONS: LessonData[] = [
  {
    id: 1,
    title: "Fruits & Basics",
    vocabulary: [
      { word: "MANGO", translation: "Manga" },
      { word: "APPLE", translation: "Maçã" },
      { word: "BANANA", translation: "Banana" },
      { word: "ORANGE", translation: "Laranja" },
      { word: "GRAPE", translation: "Uva" },
      { word: "WATERMELON", translation: "Melancia" },
      { word: "PINEAPPLE", translation: "Abacaxi" },
      { word: "STRAWBERRY", translation: "Morango" },
      { word: "PEACH", translation: "Pêssego" },
      { word: "CHERRY", translation: "Cereja" },
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
  }))
];
