const actions = [
  'Carpool and choose public transport whenever possible.',
  'Avoid open waste burning; report illegal burning events.',
  'Switch to clean cooking and low-emission fuel options.',
  'Support urban tree plantation and green mobility drives.'
];

const policies = [
  'National Clean Air Programme (NCAP)',
  'Bharat Stage VI (BS6) Emission Standards',
  'FAME India Scheme for electric mobility',
  'City-level Clean Construction and Dust Control Rules'
];

const blogs = [
  'How AQI Impacts Daily Lifestyle Decisions',
  'Top 10 Home Changes to Reduce Pollution Exposure',
  'Why Community Reporting Improves Air Governance'
];

export default function SolutionsAwareness() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Solutions & Awareness</h2>
        <p>Individual actions, policy support, and learning resources</p>
      </div>

      <div className="three-col">
        <div>
          <h3>Ways to Reduce Pollution</h3>
          <ul className="simple-list">{actions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>Government Policies</h3>
          <ul className="simple-list">{policies.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>Educational Reads</h3>
          <ul className="simple-list">{blogs.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
