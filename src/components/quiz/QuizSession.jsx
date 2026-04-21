import React, { useState } from 'react';
import { AppIcon } from '../AppIcons';

export const QuizSession = ({ questions, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);

  const currentQuestion = questions[currentIndex];

  const handleSelect = (optId) => {
    if (hasSubmitted) return;
    setSelectedOption(optId);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    
    const isCorrect = currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect;
    
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setIncorrectQuestions(prev => [...prev, {
        question: currentQuestion,
        selectedOption: selectedOption
      }]);
    }
    
    setHasSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setHasSubmitted(false);
      setShowHint(false);
    } else {
      onComplete({ score, total: questions.length, incorrectQuestions });
    }
  };

  const progressPercentage = ((currentIndex) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 animate-fade-in pb-24 min-h-full flex flex-col">
      {/* Header & Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onExit}
            className="text-gray-400 hover:text-gray-700 flex items-center transition-colors text-sm font-medium"
          >
            <AppIcon name="X" size={16} className="mr-1" /> Exit Quiz
          </button>
          <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            Question {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-pink-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed mb-8">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map(opt => {
              const isSelected = selectedOption === opt.id;
              let optionClasses = "relative flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer text-left w-full ";
              
              if (hasSubmitted) {
                if (opt.isCorrect) {
                  optionClasses += "border-green-500 bg-green-50 z-10";
                } else if (isSelected && !opt.isCorrect) {
                  optionClasses += "border-red-500 bg-red-50 z-10";
                } else {
                  optionClasses += "border-gray-200 opacity-50 cursor-default";
                }
              } else {
                if (isSelected) {
                  optionClasses += "border-pink-500 bg-pink-50 shadow-sm z-10";
                } else {
                  optionClasses += "border-gray-200 hover:border-pink-300 hover:bg-gray-50";
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={hasSubmitted}
                  className={optionClasses}
                >
                  <div className="flex-1 pr-8">
                    <span className={`font-medium ${hasSubmitted ? (opt.isCorrect ? 'text-green-900' : isSelected ? 'text-red-900' : 'text-gray-500') : (isSelected ? 'text-pink-900' : 'text-gray-700')}`}>
                      {opt.text}
                    </span>
                  </div>
                  {hasSubmitted && opt.isCorrect && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                      <AppIcon name="CheckCircle" size={24} fill="currentColor" className="text-white" />
                    </div>
                  )}
                  {hasSubmitted && isSelected && !opt.isCorrect && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                      <AppIcon name="XCircle" size={24} fill="currentColor" className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!hasSubmitted && currentQuestion.hint && (
            <div className="mt-8">
              {showHint ? (
                <div className="animate-fade-in bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start text-blue-800">
                  <AppIcon name="Info" size={20} className="mr-3 mt-0.5 flex-none" />
                  <p className="text-sm font-medium">{currentQuestion.hint}</p>
                </div>
              ) : (
                <button 
                  onClick={() => setShowHint(true)}
                  className="text-pink-600 text-sm font-bold flex items-center hover:text-pink-700 transition-colors"
                >
                  <AppIcon name="HelpCircle" size={16} className="mr-1" /> Need a hint?
                </button>
              )}
            </div>
          )}

          {hasSubmitted && (
            <div className={`mt-8 p-6 rounded-xl animate-fade-in border ${
              currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect 
                ? 'bg-green-50 border-green-200 text-green-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <h4 className="font-bold mb-2 flex items-center">
                {currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect 
                  ? <><AppIcon name="Check" size={20} className="mr-2" /> Correct!</>
                  : <><AppIcon name="X" size={20} className="mr-2" /> Incorrect</>
                }
              </h4>
              <p className="text-sm leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="w-full py-4 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl text-lg flex items-center justify-center transition-colors shadow-sm"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-lg flex items-center justify-center transition-colors shadow-sm"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
              <AppIcon name="ArrowRight" size={20} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
