import { Sprout } from 'lucide-react';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-grid">
          {/* Left: Brand */}
          <div className="footer-brand">
            <h3>Pollution Control Hub</h3>
            <p>
              Monitor. Understand. Act. A community-driven platform turning air
              quality data into clear health guidance and local climate action.
            </p>
          </div>

          {/* Right: Navigation columns */}
          <div className="footer-links-group">
            <div className="footer-links">
              <h4>Project</h4>
              <ul>
                <li>
                  <a href="https://github.com/Aditya8369/Pollution-Control-Hub" target="_blank" rel="noreferrer" aria-label="GitHub Repository">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="footer-icon">
                      <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Aditya8369/Pollution-Control-Hub/issues" target="_blank" rel="noreferrer" aria-label="Report an Issue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="footer-icon">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Report an Issue
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Aditya8369/Pollution-Control-Hub/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" aria-label="Contributing Guide">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="footer-icon">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    Contributing Guide
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-links">
              <h4>Data & Sources</h4>
              <ul>
                <li><a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo Air Quality API</a></li>
                <li><a href="https://github.com/Aditya8369/Pollution-Control-Hub/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {year} Pollution Control Hub.</p>
          <p>From awareness to action — one city at a time. <Sprout className="inline-icon" size={16} aria-hidden="true" /></p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;