import { GoogleGenAI, Modality } from "@google/genai";

let ai: any = null;

const getAi = () => {
  if (!ai) {
    // Platform-injected Gemini API key
    let apiKey = '';
    try {
      apiKey = process.env.GEMINI_API_KEY || '';
    } catch (e) {
      console.warn("Could not access process.env.GEMINI_API_KEY");
    }

    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }
  }
  return ai;
};

const audioCache = new Map<string, string>();

export const getGeminiSpeech = async (text: string, voice: 'Charon' | 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' = 'Charon'): Promise<string | null> => {
  const cacheKey = `${voice}:${text}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

  const aiInstance = getAi();
  if (!aiInstance) {
    console.warn("Gemini AI Instance not available - check API Key");
    return null;
  }

  try {
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say this clearly in a natural British accent: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Fenrir is usually a deeper, more distinct male voice.
            // Kore is a clear female voice.
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      audioCache.set(cacheKey, base64Audio);
      return base64Audio;
    }
  } catch (error) {
    console.error("Gemini TTS Error:", error);
  }
  return null;
};

let audioContext: AudioContext | null = null;

/**
 * Unlocks or initializes the AudioContext during a user gesture.
 * This is CRITICAL for mobile browsers which block async audio.
 */
export const initAudioContext = async () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play a tiny bit of silence to fully prime the device's audio hardware
    const osc = audioContext.createOscillator();
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    osc.connect(silentGain);
    silentGain.connect(audioContext.destination);
    osc.start(0);
    osc.stop(0.001);

    return audioContext;
  } catch (e) {
    console.error("Failed to init AudioContext:", e);
    return null;
  }
};

export const playBase64Audio = async (base64Data: string) => {
  try {
    // Ensure context is ready
    const ctx = await initAudioContext();
    if (!ctx) {
      console.error("Web Audio API not supported or could not be initialized");
      return;
    }

    const binaryString = atob(base64Data);
    const buffer = new ArrayBuffer(binaryString.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binaryString.length; i++) {
      view[i] = binaryString.charCodeAt(i);
    }
    
    // Int16 PCM to Float32 conversion
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768; 
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
};
