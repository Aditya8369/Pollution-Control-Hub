const sections = [
  {
    title: 'Lungs',
    impact: 'Fine particles inflame airways and can worsen asthma, bronchitis, and breathing difficulty.'
  },
  {
    title: 'Heart',
    impact: 'Long-term exposure to polluted air increases blood pressure and cardiovascular disease risk.'
  },
  {
    title: 'Skin',
    impact: 'Air pollutants and smog can trigger irritation, dryness, and premature aging.'
  }
];

const tips = [
  'Wear a high-filtration mask in traffic-heavy zones.',
  'Use an indoor air purifier during high AQI periods.',
  'Prefer indoor workouts when AQI is unhealthy.',
  'Hydrate well and keep indoor plants for better air quality awareness.'
];

export default function HealthAdvisory() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Health Advisory</h2>
        <p>How pollution affects your body and what you can do now</p>
      </div>

      <div className="advisory-grid">
        {sections.map((section) => (
          <article key={section.title} className="advisory-card">
            <h3>{section.title}</h3>
            <p>{section.impact}</p>
          </article>
        ))}
      </div>

      <ul className="tips-list">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}
