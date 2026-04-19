let voices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

// Function to refresh the voices list
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
  // Fallback: poll a few times for mobile browsers that don't fire the event early enough
  let retries = 0;
  const pollVoices = setInterval(() => {
    refreshVoices();
    retries++;
    if (voicesLoaded || retries > 10) clearInterval(pollVoices);
  }, 500);
}

export type VoiceGender = 'male' | 'female' | 'random';

export const speak = (text: string, gender: VoiceGender = 'random') => {
  if (!window.speechSynthesis) return;

  // Force voice refresh in case it's still empty (common on mobile)
  if (voices.length === 0) {
    voices = window.speechSynthesis.getVoices();
  }

  // Cancel any existing speech
  window.speechSynthesis.cancel();

  // If text is all uppercase, lowercase it to prevent spelling out letter by letter
  const processedText = text.length > 1 && text === text.toUpperCase() 
    ? text.toLowerCase() 
    : text;

  const utterance = new SpeechSynthesisUtterance(processedText);
  utterance.lang = 'en-GB';

  // Determine target gender if random
  let targetGender = gender;
  if (gender === 'random') {
    targetGender = Math.random() > 0.5 ? 'male' : 'female';
  }

  const findBritishVoice = (preferredGender: 'male' | 'female') => {
    return voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase().replace('_', '-');
      // Look for en-GB, en_GB or even just en-gb-x- (Android format)
      const isUK = lang === 'en-gb' || lang === 'en_gb' || lang.startsWith('en-gb-');
      
      const isMaleNames = ['arthur', 'daniel', 'david', 'james', 'oliver', 'harry', 'thomas', 'guy', 'brian', 'uk-male', 'george', 'male'].some(n => name.includes(n));
      const isFemaleNames = ['martha', 'hazel', 'alice', 'victoria', 'elizabeth', 'sonia', 'uk-female', 'female', 'serena', 'kate', 'hazel'].some(n => name.includes(n));

      if (preferredGender === 'male') return isUK && isMaleNames;
      return isUK && isFemaleNames;
    });
  };

  // 1. Try to find the exact preferred British voice
  // 2. Try to find ANY British voice (even if gender is wrong)
  // 3. Fallback to any voice of the preferred gender
  const britishVoice = findBritishVoice(targetGender as 'male' | 'female') || 
                      findBritishVoice(targetGender === 'male' ? 'female' : 'male') ||
                      voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'));

  if (britishVoice) {
    utterance.voice = britishVoice;
    // Adjust pitch to reinforce the gender feel
    if (targetGender === 'male') {
      utterance.pitch = 0.85;
    } else {
      utterance.pitch = 1.15;
    }
  } else {
    // If no British voice, try ANY gender-matching voice as a fallback
    const fallbackVoice = voices.find(v => v.name.toLowerCase().includes(targetGender));
    if (fallbackVoice) {
      utterance.voice = fallbackVoice;
      utterance.pitch = targetGender === 'male' ? 0.75 : 1.25;
    } else {
      // Last resort: robotic voice but pitch shifted to target gender
      utterance.pitch = targetGender === 'male' ? 0.7 : 1.3; 
    }
  }

  utterance.rate = 0.82; // Balanced speed for mobile clarity
  window.speechSynthesis.speak(utterance);
};





