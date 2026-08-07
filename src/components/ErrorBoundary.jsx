import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** @param {any} error */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * @param {any} error
   * @param {any} errorInfo
   */
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          className="panel error-boundary-fallback"
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            margin: '0 auto var(--sp-4)',
            width: 'min(1180px, 94vw)'
          }}
        >
          <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Something went wrong
          </h3>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '1rem' }}>
            We encountered an unexpected error rendering this section: {this.state.error?.message || 'Unknown error'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button 
              type="button" 
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: 'var(--primary, #0d9488)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
            >
              Try Again
            </button>
            <button 
              type="button" 
              onClick={this.handleReload}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: 'transparent',
                color: 'var(--ink, #0f172a)',
                border: '1px solid var(--line, #cbd5e1)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
            >
              Reload Page
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
