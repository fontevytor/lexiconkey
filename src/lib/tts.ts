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
  
  // Polling for mobile - critical for iOS/Android
  let retries = 0;
  const pollVoices = setInterval(() => {
    refreshVoices();
    retries++;
    if (voicesLoaded || retries > 20) clearInterval(pollVoices);
  }, 250);
}

export type VoiceGender = 'male' | 'female' | 'random';

export const speak = (text: string, gender: VoiceGender = 'random') => {
  if (!window.speechSynthesis) return;

  // Final check for voices just before speaking
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

  // Exhaustive lists for British Voices
  const UK_MALE_NAMES = [
    'daniel', 'arthur', 'oliver', 'harry', 'david', 'james', 'thomas', 
    'guy', 'brian', 'george', 'male', 'uk male', 'google uk english male',
    'en-gb-x-fis-local', 'en-gb-x-rjs-local', 'en-gb-x-gbk-local', 'uk-male'
  ];
  
  const UK_FEMALE_NAMES = [
    'martha', 'hazel', 'serena', 'alice', 'victoria', 'elizabeth', 'sonia', 
    'kate', 'fiona', 'female', 'uk female', 'google uk english female',
    'en-gb-x-gba-local', 'en-gb-x-gbb-local', 'en-gb-x-gbd-local', 'uk-female'
  ];

  const findVoice = (preferredGender: 'male' | 'female', preferredLang: string) => {
    return voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase().replace('_', '-');
      const isCorrectLang = lang.startsWith(preferredLang.toLowerCase());
      
      if (!isCorrectLang) return false;

      const maleMatch = UK_MALE_NAMES.some(n => name.includes(n));
      const femaleMatch = UK_FEMALE_NAMES.some(n => name.includes(n));

      if (preferredGender === 'male') return maleMatch;
      return femaleMatch;
    });
  };

  // 1. Try exact British Male/Female
  let voice = findVoice(targetGender as 'male' | 'female', 'en-gb');

  // 2. If not found, try ANY British voice (ignore gender temporarily but keep locale)
  if (!voice) {
    voice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'));
  }

  if (voice) {
    utterance.voice = voice;
    // Force pitch modification to help differentiate if the browser returned a generic voice
    const isActuallyMale = UK_MALE_NAMES.some(n => voice!.name.toLowerCase().includes(n));
    const isActuallyFemale = UK_FEMALE_NAMES.some(n => voice!.name.toLowerCase().includes(n));

    if (targetGender === 'male') {
      utterance.pitch = isActuallyMale ? 0.85 : 0.65; // Make it extra deep if we had to use a neutral/female voice
    } else {
      utterance.pitch = isActuallyFemale ? 1.05 : 1.25; // Make it higher if we had to use a neutral/male voice
    }
  } else {
    // 3. Last fallback: Try ANY voice of preferred gender from ANY English locale (US, AU, etc.)
    const anyEnglishVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const isEnglish = lang.startsWith('en');
      if (!isEnglish) return false;
      
      return targetGender === 'male' ? name.includes('male') : name.includes('female');
    });

    if (anyEnglishVoice) {
      utterance.voice = anyEnglishVoice;
      utterance.pitch = targetGender === 'male' ? 0.75 : 1.25;
    } else {
      // 4. Absolute fallback: Just shift the pitch of the generic system voice
      utterance.pitch = targetGender === 'male' ? 0.6 : 1.4;
    }
  }

  utterance.rate = 0.8; // Clear and steady
  window.speechSynthesis.speak(utterance);
};






