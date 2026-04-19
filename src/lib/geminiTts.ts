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

export const playBase64Audio = async (base64Data: string) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API not supported in this browser");
      return;
    }
    
    const audioContext = new AudioContextClass();
    console.log("AudioContext state:", audioContext.state);
    
    if (audioContext.state === 'suspended') {
      console.log("Attempting to resume AudioContext...");
      await audioContext.resume();
      console.log("AudioContext state after resume:", audioContext.state);
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
      float32Array[i] = int16Array[i] / 32768; // 16-bit range is -32768 to 32767
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
};
