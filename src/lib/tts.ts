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

export const speak = (text: string) => {
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

  // Specific search for British Male voices across different platforms:
  // iOS/macOS: "Arthur", "Daniel", "Oliver"
  // Android/Chrome: "Google UK English Male", "en-gb-x-fis-local"
  // Windows: "George", "Hazel" (female but UK)
  const britishMaleVoice = voices.find(v => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase().replace('_', '-');
    const isUK = lang.startsWith('en-gb');
    
    // Prioritize known male names or male identifiers
    const isMale = name.includes('male') || 
                   name.includes('arthur') || 
                   name.includes('daniel') || 
                   name.includes('david') || 
                   name.includes('james') ||
                   name.includes('oliver') ||
                   name.includes('harry') ||
                   name.includes('thomas') ||
                   name.includes('guy') ||
                   name.includes('brian') ||
                   name.includes('uk-male');
    
    return isUK && isMale;
  }) || voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'));

  if (britishMaleVoice) {
    utterance.voice = britishMaleVoice;
    // Adjust pitch down for male voices if they sound too high
    utterance.pitch = 0.85;
  } else {
    // If no British voice, try ANY male voice as a fallback
    const maleVoice = voices.find(v => v.name.toLowerCase().includes('male'));
    if (maleVoice) {
      utterance.voice = maleVoice;
      utterance.pitch = 0.8;
    } else {
      // Last resort: robotic voice but lowered pitch
      utterance.pitch = 0.7; 
    }
  }

  utterance.rate = 0.8; // Slower for clear pronunciation
  window.speechSynthesis.speak(utterance);
};



