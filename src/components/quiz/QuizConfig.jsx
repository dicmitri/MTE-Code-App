import React, { useState, useMemo } from 'react';
import { FULL_CODE_DATA } from '../../data/codeData';
import { FULL_QUIZ_DATA } from '../../data/quizData';
import { AppIcon } from '../AppIcons';

export const QuizConfig = ({ onStart }) => {
  // Extract unique chapters that actually have quiz questions
  const availableChapters = useMemo(() => {
    const chapterIdsWithQuestions = new Set(FULL_QUIZ_DATA.map(q => q.chapterId));
    
    return FULL_CODE_DATA.filter(ch => chapterIdsWithQuestions.has(ch.id)).map(ch => ({
      id: ch.id,
      title: ch.title,
      questionCount: FULL_QUIZ_DATA.filter(q => q.chapterId === ch.id).length
    }));
  }, []);

  const totalAvailableQuestions = availableChapters.reduce((acc, ch) => acc + ch.questionCount, 0);

  const [selectedChapters, setSelectedChapters] = useState(
    availableChapters.map(c => c.id) // Default to all selected
  );
  
  const selectedQuestionCount = FULL_QUIZ_DATA.filter(q => selectedChapters.includes(q.chapterId)).length;
  
  const [questionLimit, setQuestionLimit] = useState(Math.min(10, selectedQuestionCount));

  const handleToggleChapter = (chapterId) => {
    setSelectedChapters(prev => {
      const newSelection = prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId];
      
      return newSelection;
    });
  };

  const handleStart = () => {
    if (selectedChapters.length === 0) return;
    onStart({
      chapters: selectedChapters,
      limit: questionLimit,
    });
  };

  // Adjust limit if selection changes
  React.useEffect(() => {
    if (questionLimit > selectedQuestionCount) {
      setQuestionLimit(selectedQuestionCount);
    } else if (questionLimit === 0 && selectedQuestionCount > 0) {
      setQuestionLimit(Math.min(10, selectedQuestionCount));
    }
  }, [selectedQuestionCount, questionLimit]);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 animate-fade-in pb-24">
      <div className="text-center mb-10">
        <div className="bg-pink-50 text-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <AppIcon name="BookOpen" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Knowledge Quiz</h2>
        <p className="text-gray-500 text-lg">Test your understanding of the Code of Ethical Business Practice.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <AppIcon name="List" size={20} className="mr-2 text-gray-400" />
            1. Select Chapters
          </h3>
          <p className="text-sm text-gray-500 mt-1">Choose the topics you want to be tested on.</p>
        </div>
        
        <div className="p-4 flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {availableChapters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No questions available.</div>
          ) : (
            availableChapters.map(ch => (
              <label 
                key={ch.id} 
                className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChapters.includes(ch.id) 
                  ? 'border-pink-500 bg-pink-50/30' 
                  : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{ch.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''} available</div>
                </div>
                <div className="ml-4 flex h-full items-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500 cursor-pointer"
                    checked={selectedChapters.includes(ch.id)}
                    onChange={() => handleToggleChapter(ch.id)}
                  />
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <AppIcon name="HelpCircle" size={20} className="mr-2 text-gray-400" />
            2. Number of Questions
          </h3>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-medium">How many questions?</span>
            <span className="text-2xl font-bold text-pink-600">{questionLimit}</span>
          </div>
          <input
            type="range"
            min="1"
            max={selectedQuestionCount || 1}
            value={questionLimit}
            onChange={(e) => setQuestionLimit(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
            disabled={selectedQuestionCount === 0}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>1</span>
            <span>Max ({selectedQuestionCount})</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={selectedChapters.length === 0 || selectedQuestionCount === 0}
        className="w-full py-4 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg flex items-center justify-center transition-colors shadow-sm"
      >
        Start Quiz
        <AppIcon name="ArrowRight" size={20} className="ml-2" />
      </button>
    </div>
  );
};
