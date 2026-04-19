let voices: SpeechSynthesisVoice[] = [];

// Pre-fill voices and listen for changes
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const getVoices = () => {
    voices = window.speechSynthesis.getVoices();
  };
  getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = getVoices;
  }
}

export type VoiceGender = 'male' | 'female' | 'random';

export const speak = (text: string, gender: VoiceGender = 'random') => {
  if (!window.speechSynthesis) return;

  // Cancel any existing speech
  window.speechSynthesis.cancel();

  // If text is all uppercase, lowercase it to prevent spelling out letter by letter
  const processedText = text.length > 1 && text === text.toUpperCase() 
    ? text.toLowerCase() 
    : text;

  const utterance = new SpeechSynthesisUtterance(processedText);
  
  // Re-fetch voices if empty (common on mobile browsers)
  if (voices.length === 0) {
    voices = window.speechSynthesis.getVoices();
  }

  // Set general language first
  utterance.lang = 'en-GB';

  // Determine target gender if random
  let targetGender = gender;
  if (gender === 'random') {
    targetGender = Math.random() > 0.5 ? 'male' : 'female';
  }

  // Common British voices names:
  // Male: "Arthur", "Daniel", "Oliver", "Harry", "David", "James", "Guy", "Brian"
  // Female: "Martha", "Hazel", "Alice", "Google UK English Female", "Victoria", "Elizabeth", "Sonia"

  const findBritishVoice = (preferredGender: 'male' | 'female') => {
    return voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase().replace('_', '-');
      const isUK = lang.startsWith('en-gb');
      
      const isPreferredMale = name.includes('male') || 
                              ['arthur', 'daniel', 'david', 'james', 'oliver', 'harry', 'thomas', 'guy', 'brian', 'uk-male', 'george'].some(n => name.includes(n));
      
      const isPreferredFemale = name.includes('female') || 
                                ['martha', 'hazel', 'alice', 'victoria', 'elizabeth', 'sonia', 'uk-female'].some(n => name.includes(n));

      if (preferredGender === 'male') return isUK && isPreferredMale;
      return isUK && isPreferredFemale;
    });
  };

  const britishVoice = findBritishVoice(targetGender as 'male' | 'female') || 
                      findBritishVoice(targetGender === 'male' ? 'female' : 'male') || // Fallback to other gender if preferred not found
                      voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'));

  if (britishVoice) {
    utterance.voice = britishVoice;
    // Adjust pitch based on gender
    if (targetGender === 'male') {
      utterance.pitch = 0.85;
    } else {
      utterance.pitch = 1.1;
    }
  } else {
    // If no British voice, try ANY voice of preferred gender as a fallback
    const fallbackVoice = voices.find(v => v.name.toLowerCase().includes(targetGender));
    if (fallbackVoice) {
      utterance.voice = fallbackVoice;
      utterance.pitch = targetGender === 'male' ? 0.8 : 1.1;
    } else {
      // Last resort: robotic voice but shifted pitch
      utterance.pitch = targetGender === 'male' ? 0.7 : 1.2; 
    }
  }

  utterance.rate = 0.8; // Slower for clear pronunciation
  window.speechSynthesis.speak(utterance);
};




