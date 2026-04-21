import React, { useState, useEffect } from 'react';
import { QuizConfig } from './QuizConfig';
import { QuizSession } from './QuizSession';
import { QuizResults } from './QuizResults';
import { FULL_QUIZ_DATA } from '../../data/quizData';

export const QuizContent = ({ setActiveSection, setActiveId }) => {
  const [phase, setPhase] = useState('config'); // 'config', 'session', 'results'
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('#quiz?q=')) {
      const qParams = hash.split('?q=')[1].split('&')[0];
      const sharedQuestionIds = qParams.split(',').filter(Boolean);
      
      if (sharedQuestionIds.length > 0) {
        const sharedQuestions = sharedQuestionIds
          .map(id => FULL_QUIZ_DATA.find(q => q.id === id))
          .filter(Boolean);
          
        if (sharedQuestions.length > 0) {
          setConfig({
            chapters: [],
            limit: sharedQuestions.length,
            isShared: true,
            sharedIds: sharedQuestionIds
          });
          setQuestions(sharedQuestions);
          setPhase('session');
        }
      }
    }
  }, []);

  const handleStartQuiz = (newConfig) => {
    setConfig(newConfig);
    
    // Filter questions by selected chapters
    let potentialQuestions = FULL_QUIZ_DATA.filter(q => newConfig.chapters.includes(q.chapterId));
    
    // Shuffle questions
    potentialQuestions = potentialQuestions.sort(() => 0.5 - Math.random());
    
    // Limit to requested number
    const selectedQuestions = potentialQuestions.slice(0, newConfig.limit);
    
    setQuestions(selectedQuestions);
    setPhase('session');
  };

  const handleComplete = (quizResults) => {
    setResults({ ...quizResults, questions });
    setPhase('results');
  };

  const handleRestart = () => {
    if (window.location.hash.includes('?q=')) {
      window.history.replaceState(null, '', `${window.location.pathname}#quiz`);
    }
    setPhase('config');
    setResults(null);
  };

  const handleExit = () => {
    setActiveSection(null);
    setActiveId('home');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50/50">
      {phase === 'config' && (
        <QuizConfig onStart={handleStartQuiz} />
      )}
      
      {phase === 'session' && (
        <QuizSession 
          questions={questions} 
          onComplete={handleComplete} 
          onExit={handleExit} 
        />
      )}
      
      {phase === 'results' && (
        <QuizResults 
          results={results} 
          config={config}
          onRestart={handleRestart}
          onExit={handleExit} 
        />
      )}
    </div>
  );
};
