import { getGeminiSpeech, playBase64Audio, initAudioContext } from './geminiTts';

export type VoiceGender = 'male1' | 'male2' | 'female1' | 'female2' | 'random';

// Track current speech to allow cancellation
let currentGeminiText = '';

export const speak = async (text: string, gender: VoiceGender = 'random') => {
  // 0. IMPORTANT: Unlock AudioContext immediately during the user gesture!
  // This must be the first thing we do, before any async await calls.
  await initAudioContext();

  // 1. Cancel any existing system speech fallback (if any was running)
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // 2. Determine target Gemini voice
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

  // 3. PURE ONLINE TTS: Only fetch from Gemini.
  // We removed the robotic system fallback because it produces low quality 
  // and incorrect results on mobile.
  try {
    const audioData = await getGeminiSpeech(text, targetVoice as any);
    // If the text has changed since we started fetching, don't play
    if (audioData && currentGeminiText === text) {
      await playBase64Audio(audioData);
    }
  } catch (err) {
    console.error("Gemini TTS fetch/play failed:", err);
  }
};







