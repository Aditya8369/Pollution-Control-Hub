import { useMemo, useState } from 'react';

const QUIZ_SETS = {
  'eco-iq': {
    name: 'Eco IQ Challenge',
    desc: 'Test your environmental intelligence on pollution and sustainability.',
    questions: [
      {
        question: 'Which pollutant is most strongly linked with deep lung penetration?',
        options: ['PM10', 'PM2.5', 'Ozone', 'Sulfur dioxide'],
        answerHash: '7d02b73563670765accecb297ce9180e76a368c706452fbb7643c9b6321b5d7b',
        explanation: 'PM2.5 particles can reach deep into lungs and enter the bloodstream.'
      },
      {
        question: 'What AQI range is unhealthy for sensitive groups?',
        options: ['0-50', '51-100', '101-150', '151-200'],
        answerHash: 'a7f59a36a01212246e3b6c8e70224336ab56fc06b9b24fce42cf415396a3a8f1',
        explanation: 'AQI 101-150 affects children, elderly, and asthma patients most.'
      },
      {
        question: 'Which habit most directly reduces urban air pollution?',
        options: ['Using private cars', 'Carpooling or public transport', 'Burning waste', 'Idling vehicles'],
        answerHash: '8d20d51bdf72b2e1f290937760700af454eb566f39a14afc35c94c739edbd0e5',
        explanation: 'Shared mobility reduces per-person emissions significantly.'
      },
      {
        question: 'During high AQI days, best for outdoor exercise?',
        options: ['Increase intensity', 'Continue normally', 'Move indoors', 'Exercise near traffic'],
        answerHash: 'b76a9a5891df4193ddafe8293f4ee1f6a4668647eba5ec01766672d76e20dd84',
        explanation: 'Reduced outdoor exertion lowers harmful pollutant inhalation.'
      },
      {
        question: 'Which gas is associated with traffic emissions?',
        options: ['Nitrogen dioxide (NO2)', 'Helium', 'Hydrogen', 'Neon'],
        answerHash: '4a7bd0851719eda81eeced0480c1693c02fdcfa62928deb78e51e4bfc334efdf',
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
        answerHash: 'aa57740dea175294695951dfdc3a6b799de0c698d41c96ae16c5dc47e3976b86',
        explanation: 'Vehicular emissions account for roughly 30% of urban air pollution.'
      },
      {
        question: 'Which indoor activity most degrades air quality?',
        options: ['Reading', 'Cooking without ventilation', 'Sleeping', 'Using laptop'],
        answerHash: 'a2e696289801a564228c4f6e172e339ec3b3ed6ab157c45ae746695124f78fd9',
        explanation: 'Unventilated cooking releases PM2.5 and harmful gases indoors.'
      },
      {
        question: 'What is the primary source of ozone pollution?',
        options: ['Vehicle exhaust', 'Factories', 'Chemical reactions in sun', 'Trees'],
        answerHash: '7f9dd6c0322b97508924be0991e948f45a8bd4a855a797f80d1732d9199449ea',
        explanation: 'Ozone forms from NOx and volatile organic compounds under sunlight.'
      },
      {
        question: 'How many people die annually due to air pollution?',
        options: ['1 million', '3 million', '7 million', '10 million'],
        answerHash: 'bd6a9bfdc3b91ac1b9e78391acb33e8fd479cc6e3e72b76c585fe43060f44c39',
        explanation: 'WHO estimates 7 million premature deaths annually from air pollution.'
      },
      {
        question: 'Which air filter is most effective against PM2.5?',
        options: ['Cloth mask', 'N95 mask', 'Paper mask', 'No mask needed'],
        answerHash: 'f8dfd1bc1f2304a6a35f14c8bdbb338866a69640cd2f5773177ef89dca950beb',
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
        answerHash: '45cbc695e786f4e3c7676cccbce0436c873661eec2425b95ca872098ef501e7b',
        explanation: 'Banyan trees are efficient carbon absorbers and natural air purifiers.'
      },
      {
        question: 'What renewable energy produces least pollution?',
        options: ['Solar', 'Wind', 'Hydroelectric', 'All equally clean'],
        answerHash: 'c05750a560843df3c40f622f7527eb25db952b68d8f5483baabe8c9f1bf0d2bd',
        explanation: 'All major renewables produce minimal pollution during operation.'
      },
      {
        question: 'Which reduces carbon footprint most?',
        options: ['Recycling', 'Walking/biking', 'LED bulbs', 'Short flights'],
        answerHash: 'a532d07f8508237e0fce3d456d2909b5066208b79a2b85fb75f7f7bcc23891c7',
        explanation: 'Active transport eliminates emissions vs. motorized travel entirely.'
      },
      {
        question: 'What percentage of plastic is properly recycled?',
        options: ['30%', '50%', '70%', '90%'],
        answerHash: 'aa57740dea175294695951dfdc3a6b799de0c698d41c96ae16c5dc47e3976b86',
        explanation: 'Only about 30% of plastic waste is recycled globally.'
      },
      {
        question: 'Industrial emissions control uses which technology most?',
        options: ['Filters', 'Scrubbers', 'Electrostatic precipitators', 'All combined'],
        answerHash: '16f1a5813f20625bb74783d27f1b05464e3aeb467ad6fd0ee721d24e4a0f50b4',
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
        answerHash: '1b17869e03ecc1b0f86b003c199606eb68eaceb18927e3843a935cf7f6157152',
        explanation: 'Winter has temperature inversions that trap pollutants near ground.'
      },
      {
        question: 'What reduces indoor pollution most effectively?',
        options: ['Air freshener', 'Plants and ventilation', 'Perfume', 'Candles'],
        answerHash: 'd941b6660ff23444581bb643844abc4534f0235a27263e3acc28b25ff4c4e511',
        explanation: 'Plants absorb toxins and ventilation removes stale air naturally.'
      },
      {
        question: 'Which pollutant causes acid rain?',
        options: ['PM10', 'SO2 and NOx', 'CO2', 'Ozone'],
        answerHash: '490ce61659c0b636294f84fc13d0e7b0fa03a0b9a37c89501a3a10bbe0c9f2b9',
        explanation: 'Sulfur dioxide and nitrogen oxides react with moisture to form acid rain.'
      },
      {
        question: 'How long does car pollution stay in air?',
        options: ['Minutes', 'Hours', 'Days', 'Weeks'],
        answerHash: 'e08c0aa8f558f39fa99077e92036cf7d2210fe88ffae4d3b30fd489d9ac99e02',
        explanation: 'Pollutants can remain airborne for several days, traveling hundreds of km.'
      },
      {
        question: 'Best practice for reducing vehicle emissions?',
        options: ['Drive faster', 'Maintain vehicle regularly', 'Use AC always', 'Idle engine'],
        answerHash: '14f7941a9786a876d0e34d6a36c174e08616c50a13ad62e2a2b200da974ff80a',
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
        answerHash: '7d1550b844ff586a6023216c06263105eed0a849a2a1f69bb8862ab288d8cdab',
        explanation: 'Delhi frequently ranks among the most polluted cities globally.'
      },
      {
        question: 'What does AQI stand for?',
        options: ['Air Quality Index', 'Atmosphere Quality Indicator', 'Air Qty Interface', 'Airborne Quantile Index'],
        answerHash: '02184adb809e467cee08bd37dfaead5f18df398b9a7a3db6a1a31a243b5b2fe4',
        explanation: 'AQI is the standard measure of air quality and pollution levels.'
      },
      {
        question: 'Which business generates most air pollution?',
        options: ['Retail', 'Manufacturing', 'Hospitality', 'IT'],
        answerHash: 'c6838ed989fd7d93ba9023466783c95230843ee13acafd63a355f9ad766cc39f',
        explanation: 'Manufacturing industries produce the highest industrial emissions.'
      },
      {
        question: 'How does smog form?',
        options: ['Only fog', 'Sunlight + pollution reaction', 'Only dust', 'Rain effect'],
        answerHash: '7bda4c4c0753424910eec8881677e6355e4f7eb21073142effc710653224df7b',
        explanation: 'Smog is photochemical fog created when UV light reacts with pollutants.'
      },
      {
        question: 'Which age group suffers most from air pollution?',
        options: ['Teens', 'Children and elderly', 'Young adults', 'Middle-aged'],
        answerHash: '7c4d01250a6a84df2831f286ae8e534893ef7d065663192d8a9d32da4bd1c2cc',
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
        answerHash: '744e451cd1bdddda310a3487a0ca6d3d370e58276dedbb953114c168438409a4',
        explanation: 'Using natural and non-toxic products plus ventilation is most effective.'
      },
      {
        question: 'Which food choice reduces pollution?',
        options: ['Imported fruit', 'Local vegetables', 'Frozen meals', 'Fast food'],
        answerHash: '4304a819d91ddbeaa9579fee43da9d9fd2059853eabf881683c15bb5ad102ad0',
        explanation: 'Local food reduces transport emissions significantly.'
      },
      {
        question: 'What percentage of emissions come from agriculture?',
        options: ['5%', '10%', '15%', '24%'],
        answerHash: '80a49661b4c9e3a4b51d72a4c888a7f0702cbf057df09bc1f5621f02469e1402',
        explanation: 'Agriculture accounts for roughly 24% of global emissions.'
      },
      {
        question: 'Best renewable for homes?',
        options: ['Nuclear', 'Solar', 'Coal gasification', 'Imported wind'],
        answerHash: '31ce6e79178093b714406b55954c625a9fd47b70c7a6802d5fb5e744422e475c',
        explanation: 'Solar panels are most practical for individual home energy needs.'
      },
      {
        question: 'How to protect lungs from pollution?',
        options: ['Avoid masks', 'Wear masks on high AQI', 'Smoke more', 'Exercise always'],
        answerHash: 'aab31329664216dbd8c563a005b52fc14ea5e86eba72f2e9ffb48deed3d62a7b',
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
        answerHash: 'c58c81f68e554c5d412bd7f7cfb94fff36294d42bb5c9dc39ed6041765bbe381',
        explanation: 'Understanding local air quality is the first step to action.'
      },
      {
        question: 'Most impactful personal action?',
        options: ['Complain', 'Change transport habits', 'Ignore issue', 'Wait for government'],
        answerHash: '40b17aeb7622b26534967abf3c773dcc2d9235c55c075ad8f22be8384aa93a9b',
        explanation: 'Personal transport choices have immediate and visible impact.'
      },
      {
        question: 'Which cause highest particulate pollution in homes?',
        options: ['Dust', 'Cooking emissions', 'Pets', 'Furniture'],
        answerHash: '2680d7e51a8fef0a6621fe9c5c725d43bc5dfa626f684fb60cabbada2af31b4d',
        explanation: 'Unventilated cooking is the largest source of indoor PM2.5.'
      },
      {
        question: 'What strengthens environmental policy?',
        options: ['Silence', 'Public awareness and demand', 'Ignoring', 'Denial'],
        answerHash: 'c9fb1fc5e6e0a087b681839ce9e94e6ae3336ffb38bd76b6555bf68db444e847',
        explanation: 'Informed public pressure drives stronger environmental policies.'
      },
      {
        question: 'Best long-term pollution solution?',
        options: ['Masks for all', 'Community action and policy', 'Filters only', 'No solution'],
        answerHash: '33a8081bc2e57520284011e57adb3405251140e89724f490b61ea597b6734c60',
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
        answerHash: '9210ff07e695977b336ae3cbdd66ddeacb2d42b8442c717fde88bbebc2068045',
        explanation: 'Transitioning to clean energy is the most impactful long-term solution.'
      },
      {
        question: 'What is carbon sequestration?',
        options: ['Burning coal', 'Capturing CO2 from air', 'Flying planes', 'Driving cars'],
        answerHash: 'd43976703f8505ab276ed978f4fdee36f328a5c090a024e9ec954b39fbd95eac',
        explanation: 'Carbon sequestration removes and stores CO2 from the atmosphere.'
      },
      {
        question: 'Which reduces overall emissions most?',
        options: ['Recycling alone', 'Consuming less', 'Switching brands', 'No change'],
        answerHash: '4b4913fad0deb063939b70c5c8c05043bca1be975df26568d4b07dc0fefeedea',
        explanation: 'Reduced consumption directly reduces manufacturing and transport emissions.'
      },
      {
        question: 'What is environmental justice?',
        options: ['Ignoring pollution', 'Equal pollution exposure for all', 'Rich vs poor', 'Fair environmental protection for all communities'],
        answerHash: '0dc487a7695274c75139431395ec5bf714d149b82ea3d6cce8135b496e031e33',
        explanation: 'Environmental justice ensures all communities get equal pollution protection.'
      },
      {
        question: 'Which industry transition is most urgent?',
        options: ['Entertainment', 'Energy', 'Fashion', 'Sports'],
        answerHash: 'f2fcd3f7dccadd194c4c5a54a5102c9559487743ac236a6236301e4418d0dd7c',
        explanation: 'Energy sector produces largest emissions and is crucial to transition.'
      }
    ]
  }
};

/** @param {any} params */
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

/** @param {any} params */
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

const hashString = async (message) => {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function QuizSection() {
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [correctAnswerText, setCorrectAnswerText] = useState('');

  const quizSet = selectedQuiz ? QUIZ_SETS[selectedQuiz] : null;
  const current = quizSet && quizSet.questions[index];
  const total = quizSet ? quizSet.questions.length : 0;
  const isCorrect = submitted && selected === correctAnswerText;
  const isLastQuestion = index === total - 1;
  const progress = useMemo(() => ((index + 1) / total) * 100, [index, total]);

  /** @param {any} selectedOption */
  const submitAnswer = async (selectedOption) => {
    if (submitted || isVerifying) return;

    setIsVerifying(true);
    setSelected(selectedOption);

    const hashedSelection = await hashString(selectedOption);
    const isCorrectChoice = hashedSelection === current.answerHash;

    let correctText = '';
    if (isCorrectChoice) {
      correctText = selectedOption;
    } else {
      for (const opt of current.options) {
        if (await hashString(opt) === current.answerHash) {
          correctText = opt;
          break;
        }
      }
    }

    setCorrectAnswerText(correctText);
    setSubmitted(true);
    setIsVerifying(false);

    if (isCorrectChoice) {
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
    setCorrectAnswerText('');
    setSubmitted(false);
  };

  const restartQuiz = () => {
    setSelectedQuiz(null);
    setIndex(0);
    setSelected('');
    setCorrectAnswerText('');
    setSubmitted(false);
    setScore(0);
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
            ? option === correctAnswerText
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
              disabled={submitted || isVerifying}
            >
              {option}
            </button>
          );
        })}
      </div>

      {submitted && (
        <p className={`quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          {isCorrect ? 'Correct.' : `Not quite. Correct answer: ${correctAnswerText}.`} {current.explanation}
        </p>
      )}

      <div className="quiz-actions">
        <button type="button" onClick={goNext} disabled={!submitted || isVerifying}>
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
      </div>
    </section>
  );
}
