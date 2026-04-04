import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, Send, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AssignmentQuestion } from '../data/lessons';

interface AssignmentProps {
  questions: AssignmentQuestion[];
  onComplete: (answers: string[], grade: string) => void;
  onClose: () => void;
  existingAnswers?: string[];
  existingGrade?: string;
}

export const Assignment: React.FC<AssignmentProps> = ({ 
  questions, 
  onComplete, 
  onClose,
  existingAnswers,
  existingGrade
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(existingAnswers || new Array(questions.length).fill(''));
  const [showResults, setShowResults] = useState(!!existingAnswers);

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const grade = calculateGrade();
      setShowResults(true);
      confetti();
      onComplete(answers, grade);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const highlightMatches = (studentAnswer: string, correctAnswer: string) => {
    const studentWords = studentAnswer.toLowerCase().split(/\s+/);
    const correctWords = correctAnswer.toLowerCase().split(/\s+/);
    
    return studentWords.map((word, i) => {
      const isMatch = correctWords.includes(word);
      return (
        <span 
          key={i} 
          className={isMatch ? 'text-green-800 font-bold bg-green-100 px-1 rounded' : 'text-gray-700'}
        >
          {word}{' '}
        </span>
      );
    });
  };

  const calculateGrade = () => {
    let totalScore = 0;
    questions.forEach((q, i) => {
      const studentWords = answers[i].toLowerCase().trim().split(/\s+/);
      const correctWords = q.answer.toLowerCase().trim().split(/\s+/);
      
      let matches = 0;
      correctWords.forEach(word => {
        if (studentWords.includes(word)) matches++;
      });
      
      const score = (matches / correctWords.length);
      totalScore += score;
    });
    
    return ((totalScore / questions.length) * 10).toFixed(1);
  };

  if (showResults) {
    const grade = existingGrade || calculateGrade();
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
        <div className="p-4 flex items-center justify-between border-b sticky top-0 bg-white z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Assignment Results</h2>
          <div className="w-10" />
        </div>

        <div className="p-6 max-w-3xl mx-auto w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">Assignment Completed!</h3>
            <div className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-full text-2xl font-black shadow-xl shadow-indigo-500/20">
              Grade: {grade} / 10
            </div>
            <p className="text-gray-600">Review your answers and see how you did.</p>
          </div>

          <div className="space-y-6">
            {questions.map((q, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="space-y-4 flex-1">
                    <p className="text-lg font-semibold text-gray-900">{q.question}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Answer</p>
                        <div className="p-3 bg-gray-50 rounded-xl text-gray-700">
                          {highlightMatches(answers[i], q.answer)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Correct Answer</p>
                        <div className="p-3 bg-green-50 rounded-xl text-green-700 font-medium">
                          {q.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl mt-8"
          >
            Back to Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-indigo-600">Question {currentStep + 1} of {questions.length}</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                {questions[currentStep].question}
              </h2>
              <p className="text-gray-500">Type your answer below</p>
            </div>

            <div className="relative">
              <textarea
                autoFocus
                value={answers[currentStep]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[currentStep] = e.target.value;
                  setAnswers(newAnswers);
                }}
                placeholder="Your answer here..."
                className="w-full h-40 p-6 bg-gray-50 border-2 border-gray-200 rounded-3xl text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={!answers[currentStep].trim()}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {currentStep === questions.length - 1 ? (
                  <>
                    Submit Assignment
                    <Send className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
