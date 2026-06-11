import { useMemo, useState } from 'react';

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
  'green-brain': {
    name: 'Green Brain Test',
    desc: 'Measure your knowledge of climate-friendly practices.',
    questions: [
      {
        question: 'Which tree removes the most CO2 from air?',
        options: ['Oak', 'Pine', 'Neem', 'Banyan'],
        answer: 'Banyan',
        explanation: 'Banyan trees are efficient carbon absorbers and natural air purifiers.'
      },
      {
        question: 'What renewable energy produces least pollution?',
        options: ['Solar', 'Wind', 'Hydroelectric', 'All equally clean'],
        answer: 'All equally clean',
        explanation: 'All major renewables produce minimal pollution during operation.'
      },
      {
        question: 'Which reduces carbon footprint most?',
        options: ['Recycling', 'Walking/biking', 'LED bulbs', 'Short flights'],
        answer: 'Walking/biking',
        explanation: 'Active transport eliminates emissions vs. motorized travel entirely.'
      },
      {
        question: 'What percentage of plastic is properly recycled?',
        options: ['30%', '50%', '70%', '90%'],
        answer: '30%',
        explanation: 'Only about 30% of plastic waste is recycled globally.'
      },
      {
        question: 'Industrial emissions control uses which technology most?',
        options: ['Filters', 'Scrubbers', 'Electrostatic precipitators', 'All combined'],
        answer: 'All combined',
        explanation: 'Modern factories use multiple technologies for comprehensive control.'
      }
    ]
  },
  'clean-earth': {
    name: 'Clean Earth Quiz',
    desc: 'Learn how to keep our planet healthy and pollution-free.',
    questions: [
      {
        question: 'Which season typically has highest AQI?',
        options: ['Spring', 'Summer', 'Winter', 'Monsoon'],
        answer: 'Winter',
        explanation: 'Winter has temperature inversions that trap pollutants near ground.'
      },
      {
        question: 'What reduces indoor pollution most effectively?',
        options: ['Air freshener', 'Plants and ventilation', 'Perfume', 'Candles'],
        answer: 'Plants and ventilation',
        explanation: 'Plants absorb toxins and ventilation removes stale air naturally.'
      },
      {
        question: 'Which pollutant causes acid rain?',
        options: ['PM10', 'SO2 and NOx', 'CO2', 'Ozone'],
        answer: 'SO2 and NOx',
        explanation: 'Sulfur dioxide and nitrogen oxides react with moisture to form acid rain.'
      },
      {
        question: 'How long does car pollution stay in air?',
        options: ['Minutes', 'Hours', 'Days', 'Weeks'],
        answer: 'Days',
        explanation: 'Pollutants can remain airborne for several days, traveling hundreds of km.'
      },
      {
        question: 'Best practice for reducing vehicle emissions?',
        options: ['Drive faster', 'Maintain vehicle regularly', 'Use AC always', 'Idle engine'],
        answer: 'Maintain vehicle regularly',
        explanation: 'Proper maintenance ensures efficient combustion and lower emissions.'
      }
    ]
  },
  'pollution-awareness': {
    name: 'Pollution Awareness Challenge',
    desc: 'Challenge yourself on pollution facts and solutions.',
    questions: [
      {
        question: 'Which city has historically worst air quality?',
        options: ['Beijing', 'Delhi', 'Cairo', 'Jakarta'],
        answer: 'Delhi',
        explanation: 'Delhi frequently ranks among the most polluted cities globally.'
      },
      {
        question: 'What does AQI stand for?',
        options: ['Air Quality Index', 'Atmosphere Quality Indicator', 'Air Qty Interface', 'Airborne Quantile Index'],
        answer: 'Air Quality Index',
        explanation: 'AQI is the standard measure of air quality and pollution levels.'
      },
      {
        question: 'Which business generates most air pollution?',
        options: ['Retail', 'Manufacturing', 'Hospitality', 'IT'],
        answer: 'Manufacturing',
        explanation: 'Manufacturing industries produce the highest industrial emissions.'
      },
      {
        question: 'How does smog form?',
        options: ['Only fog', 'Sunlight + pollution reaction', 'Only dust', 'Rain effect'],
        answer: 'Sunlight + pollution reaction',
        explanation: 'Smog is photochemical fog created when UV light reacts with pollutants.'
      },
      {
        question: 'Which age group suffers most from air pollution?',
        options: ['Teens', 'Children and elderly', 'Young adults', 'Middle-aged'],
        answer: 'Children and elderly',
        explanation: 'Young lungs and aging bodies are most vulnerable to pollution.'
      }
    ]
  },
  'save-earth': {
    name: 'Save Earth Quiz',
    desc: 'Discover actions that protect our planet from pollution.',
    questions: [
      {
        question: 'Best way to reduce home pollution?',
        options: ['Buy filters', 'Avoid chemicals and ventilate', 'Close windows', 'Use perfume'],
        answer: 'Avoid chemicals and ventilate',
        explanation: 'Using natural and non-toxic products plus ventilation is most effective.'
      },
      {
        question: 'Which food choice reduces pollution?',
        options: ['Imported fruit', 'Local vegetables', 'Frozen meals', 'Fast food'],
        answer: 'Local vegetables',
        explanation: 'Local food reduces transport emissions significantly.'
      },
      {
        question: 'What percentage of emissions come from agriculture?',
        options: ['5%', '10%', '15%', '24%'],
        answer: '24%',
        explanation: 'Agriculture accounts for roughly 24% of global emissions.'
      },
      {
        question: 'Best renewable for homes?',
        options: ['Nuclear', 'Solar', 'Coal gasification', 'Imported wind'],
        answer: 'Solar',
        explanation: 'Solar panels are most practical for individual home energy needs.'
      },
      {
        question: 'How to protect lungs from pollution?',
        options: ['Avoid masks', 'Wear masks on high AQI', 'Smoke more', 'Exercise always'],
        answer: 'Wear masks on high AQI',
        explanation: 'N95 masks significantly reduce harmful particle inhalation.'
      }
    ]
  },
  'eco-warriors': {
    name: 'Eco Warriors Quiz',
    desc: 'Join the fight against pollution with this warrior-themed quiz.',
    questions: [
      {
        question: 'First step in pollution awareness?',
        options: ['Blame industry', 'Monitor local AQI', 'Avoid news', 'Move away'],
        answer: 'Monitor local AQI',
        explanation: 'Understanding local air quality is the first step to action.'
      },
      {
        question: 'Most impactful personal action?',
        options: ['Complain', 'Change transport habits', 'Ignore issue', 'Wait for government'],
        answer: 'Change transport habits',
        explanation: 'Personal transport choices have immediate and visible impact.'
      },
      {
        question: 'Which cause highest particulate pollution in homes?',
        options: ['Dust', 'Cooking emissions', 'Pets', 'Furniture'],
        answer: 'Cooking emissions',
        explanation: 'Unventilated cooking is the largest source of indoor PM2.5.'
      },
      {
        question: 'What strengthens environmental policy?',
        options: ['Silence', 'Public awareness and demand', 'Ignoring', 'Denial'],
        answer: 'Public awareness and demand',
        explanation: 'Informed public pressure drives stronger environmental policies.'
      },
      {
        question: 'Best long-term pollution solution?',
        options: ['Masks for all', 'Community action and policy', 'Filters only', 'No solution'],
        answer: 'Community action and policy',
        explanation: 'Systemic change through collective action is the only lasting solution.'
      }
    ]
  },
  'planet-protector': {
    name: 'Planet Protector Quiz',
    desc: 'Protect our planet by mastering pollution knowledge.',
    questions: [
      {
        question: 'Which protects planet most immediately?',
        options: ['Fossil fuels', 'Clean energy transition', 'Waiting', 'Individual action only'],
        answer: 'Clean energy transition',
        explanation: 'Transitioning to clean energy is the most impactful long-term solution.'
      },
      {
        question: 'What is carbon sequestration?',
        options: ['Burning coal', 'Capturing CO2 from air', 'Flying planes', 'Driving cars'],
        answer: 'Capturing CO2 from air',
        explanation: 'Carbon sequestration removes and stores CO2 from the atmosphere.'
      },
      {
        question: 'Which reduces overall emissions most?',
        options: ['Recycling alone', 'Consuming less', 'Switching brands', 'No change'],
        answer: 'Consuming less',
        explanation: 'Reduced consumption directly reduces manufacturing and transport emissions.'
      },
      {
        question: 'What is environmental justice?',
        options: ['Ignoring pollution', 'Equal pollution exposure for all', 'Rich vs poor', 'Fair environmental protection for all communities'],
        answer: 'Fair environmental protection for all communities',
        explanation: 'Environmental justice ensures all communities get equal pollution protection.'
      },
      {
        question: 'Which industry transition is most urgent?',
        options: ['Entertainment', 'Energy', 'Fashion', 'Sports'],
        answer: 'Energy',
        explanation: 'Energy sector produces largest emissions and is crucial to transition.'
      }
    ]
  }
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

  const submitAnswer = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    if (selected === current.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const goNext = () => {
    if (!submitted) return;
    if (isLastQuestion) {
      setIndex(total);
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected('');
    setSubmitted(false);
  };

  const restartQuiz = () => {
    setSelectedQuiz(null);
    setIndex(0);
    setSelected('');
    setSubmitted(false);
    setScore(0);
  };

  if (!selectedQuiz) {
    return (
      <section className="panel quiz-panel">
        <div className="panel-head">
          <h2>Pollution Quiz Center</h2>
        </div>
        <QuizSelector onSelectQuiz={setSelectedQuiz} />
      </section>
    );
  }

  if (index >= total) {
    return (
      <section className="panel quiz-panel">
        <div className="panel-head">
          <h2>{quizSet.name}</h2>
          <p>Quiz complete - view your results below</p>
        </div>
        <QuizResult score={score} total={total} onRestart={restartQuiz} />
      </section>
    );
  }

  return (
    <section className="panel quiz-panel">
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
              onClick={() => setSelected(option)}
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
        <button type="button" onClick={submitAnswer} disabled={!selected || submitted}>Submit</button>
        <button type="button" onClick={goNext} disabled={!submitted}>
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </section>
  );
}
