import { useMemo, useState } from 'react';
import { eventBus } from '../core/events';

// Quiz data (unchanged)
const QUIZ_SETS = {
  'eco-iq': {
    name: 'Eco IQ Challenge',
    desc: 'Test your environmental intelligence on pollution and sustainability.',
    questions: [
      {
        question: 'Which pollutant is most strongly linked with deep lung penetration?',
        options: ['PM10', 'PM2.5', 'Ozone', 'Sulfur dioxide'],
        answer: 'PM2.5',
        explanation: 'PM2.5 particles can reach deep into lungs and enter the bloodstream.'
      },
      {
        question: 'What AQI range is unhealthy for sensitive groups?',
        options: ['0-50', '51-100', '101-150', '151-200'],
        answer: '101-150',
        explanation: 'AQI 101-150 affects children, elderly, and asthma patients most.'
      },
      {
        question: 'Which habit most directly reduces urban air pollution?',
        options: ['Using private cars', 'Carpooling or public transport', 'Burning waste', 'Idling vehicles'],
        answer: 'Carpooling or public transport',
        explanation: 'Shared mobility reduces per-person emissions significantly.'
      },
      {
        question: 'During high AQI days, best for outdoor exercise?',
        options: ['Increase intensity', 'Continue normally', 'Move indoors', 'Exercise near traffic'],
        answer: 'Move indoors',
        explanation: 'Reduced outdoor exertion lowers harmful pollutant inhalation.'
      },
      {
        question: 'Which gas is associated with traffic emissions?',
        options: ['Nitrogen dioxide (NO2)', 'Helium', 'Hydrogen', 'Neon'],
        answer: 'Nitrogen dioxide (NO2)',
        explanation: 'NO2 is a major traffic pollutant that irritates airways.'
      }
    ]
  },
  'pollution-busters': {
    name: 'Pollution Busters Quiz',
    desc: 'Become a pollution fighter with this action-oriented challenge.',
    questions: [
      {
        question: 'What percentage of air pollution comes from vehicles globally?',
        options: ['15%', '30%', '50%', '70%'],
        answer: '30%',
        explanation: 'Vehicular emissions account for roughly 30% of urban air pollution.'
      },
      {
        question: 'Which indoor activity most degrades air quality?',
        options: ['Reading', 'Cooking without ventilation', 'Sleeping', 'Using laptop'],
        answer: 'Cooking without ventilation',
        explanation: 'Unventilated cooking releases PM2.5 and harmful gases indoors.'
      },
      {
        question: 'What is the primary source of ozone pollution?',
        options: ['Vehicle exhaust', 'Factories', 'Chemical reactions in sun', 'Trees'],
        answer: 'Chemical reactions in sun',
        explanation: 'Ozone forms from NOx and volatile organic compounds under sunlight.'
      },
      {
        question: 'How many people die annually due to air pollution?',
        options: ['1 million', '3 million', '7 million', '10 million'],
        answer: '7 million',
        explanation: 'WHO estimates 7 million premature deaths annually from air pollution.'
      },
      {
        question: 'Which air filter is most effective against PM2.5?',
        options: ['Cloth mask', 'N95 mask', 'Paper mask', 'No mask needed'],
        answer: 'N95 mask',
        explanation: 'N95 masks block 95% of airborne particles including PM2.5.'
      }
    ]
  },
  // ... other quiz sets omitted for brevity ...
};

function QuizSelector({ onSelectQuiz }) {
  return (
    <div className="quiz-selector">
      <h2>Choose Your Quiz</h2>
      <p>Pick a challenge to test your pollution and environmental knowledge.</p>
      <div className="quiz-cards">
        {Object.entries(QUIZ_SETS).map(([id, set]) => (
          <button key={id} type="button" className="quiz-card" onClick={() => onSelectQuiz(id)}>
            <h3>{set.name}</h3>
            <p>{set.desc}</p>
            <span className="quiz-count">{set.questions.length} questions</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizResult({ score, total, onRestart }) {
  const percent = Math.round((score / total) * 100);
  return (
    <div className="quiz-result">
      <h3>Quiz Complete</h3>
      <p className="quiz-score">{score}/{total} correct ({percent}%)</p>
      <p>{percent >= 80 ? 'Excellent! You are a pollution expert.' : percent >= 60 ? 'Good effort! Keep learning.' : 'Keep trying and improve your knowledge.'}</p>
      <button type="button" onClick={onRestart}>Try Another Quiz</button>
    </div>
  );
}

export default function QuizSection() {
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const quizSet = selectedQuiz ? QUIZ_SETS[selectedQuiz] : null;
  const current = quizSet && quizSet.questions[index];
  const total = quizSet ? quizSet.questions.length : 0;
  const isCorrect = submitted && selected === current?.answer;
  const isLastQuestion = index === total - 1;
  const progress = useMemo(() => ((index + 1) / total) * 100, [index, total]);

  const submitAnswer = (selectedOption) => {
    if (submitted) return;
    setSelected(selectedOption);
    setSubmitted(true);
    if (selectedOption === current?.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const restartQuiz = () => {
    setSelectedQuiz(null);
    setIndex(0);
    setSelected('');
    setSubmitted(false);
    setScore(0);
  };

  const goNext = () => {
    if (isLastQuestion) {
      setIndex(total); // trigger result view
    } else {
      setIndex((prev) => prev + 1);
      setSelected('');
      setSubmitted(false);
    }
  };

  if (!selectedQuiz) {
    return (
      <section data-testid="quiz-section" className="panel quiz-panel">
        <div className="panel-head">
          <h2>Pollution Quiz Center</h2>
        </div>
        <QuizSelector onSelectQuiz={setSelectedQuiz} />
      </section>
    );
  }

  if (index >= total) {
    return (
      <section data-testid="quiz-section" className="panel quiz-panel">
        <div className="panel-head">
          <h2>{quizSet.name}</h2>
          <p>Quiz complete - view your results below</p>
        </div>
        <QuizResult score={score} total={total} onRestart={restartQuiz} />
      </section>
    );
  }

  return (
    <section data-testid="quiz-section" className="panel quiz-panel">
      <div className="panel-head">
        <div className="quiz-header-row">
          <h2>{quizSet.name}</h2>
          <button type="button" className="back-btn" onClick={restartQuiz}>← Back</button>
        </div>
        <p>Question {index + 1} of {total}</p>
      </div>
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <h3 className="quiz-question">{current.question}</h3>
      <div className="quiz-options">
        {current.options.map((option) => {
          const selectedClass = selected === option ? 'selected' : '';
          const resultClass = submitted
            ? option === current.answer
              ? 'correct'
              : option === selected
                ? 'wrong'
                : ''
            : '';
          return (
            <button
              key={option}
              type="button"
              className={`quiz-option ${selectedClass} ${resultClass}`.trim()}
              onClick={() => submitAnswer(option)}
              disabled={submitted}
            >
              {option}
            </button>
          );
        })}
      </div>
      {submitted && (
        <p className={`quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          {isCorrect ? 'Correct.' : `Not quite. Correct answer: ${current.answer}.`} {current.explanation}
        </p>
      )}
      <div className="quiz-actions">
        <button type="button" onClick={goNext} disabled={!submitted}>
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </section>
  );
}
