let voices: SpeechSynthesisVoice[] = [];

// Pre-fill voices and listen for changes
if (typeof window !== 'undefined' && window.speechSynthesis) {
  voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
  };
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
  
  if (voices.length === 0) {
    voices = window.speechSynthesis.getVoices();
  }

  // Try to find a British English male voice
  // Common British Male voices: "Daniel", "Oliver", "Harry", "Thomas", "Google UK English Male", "David", "James"
  const britishMaleVoice = voices.find(v => 
    (v.lang === 'en-GB' || v.lang === 'en_GB') && 
    (
      v.name.toLowerCase().includes('male') || 
      v.name.toLowerCase().includes('david') || 
      v.name.toLowerCase().includes('james') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('oliver') ||
      v.name.toLowerCase().includes('harry') ||
      v.name.toLowerCase().includes('thomas') ||
      v.name.toLowerCase().includes('guy') ||
      v.name.toLowerCase().includes('brian')
    )
  ) || voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');

  if (britishMaleVoice) {
    utterance.voice = britishMaleVoice;
  } else {
    // If no British voice, try any male voice as a fallback
    const maleVoice = voices.find(v => v.name.toLowerCase().includes('male'));
    if (maleVoice) utterance.voice = maleVoice;
  }

  utterance.lang = 'en-GB';
  utterance.rate = 0.85; // Slightly slower for better pronunciation
  utterance.pitch = 0.9; // Slightly lower pitch to sound more masculine if a female voice is used as fallback

  window.speechSynthesis.speak(utterance);
};

