import { getGeminiSpeech, playBase64Audio } from './geminiTts';

let voices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

// Function to refresh the voices list (fallback only)
const refreshVoices = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const newVoices = window.speechSynthesis.getVoices();
    if (newVoices.length > 0) {
      voices = newVoices;
      voicesLoaded = true;
    }
  }
};

// Listen for changes and pre-fill
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
  
  let retries = 0;
  const pollVoices = setInterval(() => {
    refreshVoices();
    retries++;
    if (voicesLoaded || retries > 20) clearInterval(pollVoices);
  }, 250);
}

export type VoiceGender = 'male1' | 'male2' | 'female1' | 'female2' | 'random';

// Track current speech to allow cancellation
let currentGeminiText = '';

export const speak = async (text: string, gender: VoiceGender = 'random') => {
  // 0. Cancel any existing system speech IMMEDIATELY
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // Determine target voice
  let targetVoice: 'Fenrir' | 'Charon' | 'Kore' | 'Zephyr' | 'Puck' = 'Charon';
  
  if (gender === 'random') {
    const options: ('Fenrir' | 'Charon' | 'Kore' | 'Zephyr')[] = ['Fenrir', 'Charon', 'Kore', 'Zephyr'];
    targetVoice = options[Math.floor(Math.random() * options.length)];
  } else {
    const map: Record<string, 'Fenrir' | 'Charon' | 'Kore' | 'Zephyr'> = {
      male1: 'Fenrir',   // Deep Arthur
      male2: 'Charon',   // Standard Daniel
      female1: 'Kore',   // Soft Martha
      female2: 'Zephyr'  // Expressive Hazel
    };
    targetVoice = map[gender] || 'Charon';
  }

  currentGeminiText = text;

  try {
    const audioData = await getGeminiSpeech(text, targetVoice as any);
    // If the text has changed since we started fetching, don't play
    if (audioData && currentGeminiText === text) {
      await playBase64Audio(audioData);
      return;
    }
  } catch (err) {
    console.error("Gemini TTS failed, falling back to system voices", err);
  }

  // 2. FALLBACK to System Voices (if Gemini fails)
  if (!window.speechSynthesis) return;
  if (voices.length === 0) voices = window.speechSynthesis.getVoices();

  const processedText = text.length > 1 && text === text.toUpperCase() 
    ? text.toLowerCase() 
    : text;

  const utterance = new SpeechSynthesisUtterance(processedText);
  utterance.lang = 'en-GB';

  const UK_MALE_NAMES = ['daniel', 'arthur', 'oliver', 'harry', 'david', 'james', 'thomas', 'guy', 'brian', 'george', 'male', 'uk male'];
  const UK_FEMALE_NAMES = ['martha', 'hazel', 'serena', 'alice', 'victoria', 'elizabeth', 'sonia', 'kate', 'fiona', 'female', 'uk female'];

  const findVoice = (preferredGender: 'male' | 'female') => {
    return voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase().replace('_', '-');
      const isCorrectLang = lang.startsWith('en-gb');
      if (!isCorrectLang) return false;
      const maleMatch = UK_MALE_NAMES.some(n => name.includes(n));
      const femaleMatch = UK_FEMALE_NAMES.some(n => name.includes(n));
      return preferredGender === 'male' ? maleMatch : femaleMatch;
    });
  };

  // For system fallback, we just map back to male/female
  const fallbackGender = (gender === 'male1' || gender === 'male2' || (gender === 'random' && Math.random() > 0.5)) ? 'male' : 'female';

  let voice = findVoice(fallbackGender);
  if (!voice) voice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'));

  if (voice) {
    utterance.voice = voice;
    const isActuallyMale = UK_MALE_NAMES.some(n => voice!.name.toLowerCase().includes(n));
    const isActuallyFemale = UK_FEMALE_NAMES.some(n => voice!.name.toLowerCase().includes(n));
    if (fallbackGender === 'male') {
      utterance.pitch = isActuallyMale ? 0.85 : 0.65;
    } else {
      utterance.pitch = isActuallyFemale ? 1.05 : 1.25;
    }
  }

  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
};







