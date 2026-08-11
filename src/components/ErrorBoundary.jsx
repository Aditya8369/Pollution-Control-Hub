import React from 'react';
import { logger } from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, detailsOpen: false };
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
    // Keep the component stack around so it can be shown in the
    // (opt-in) error-details section without re-throwing.
    this.setState({ errorInfo });

    // Route the error through the shared logger abstraction instead of
    // logging directly, so it benefits from any future transport/reporting
    // changes made there. Guarded in a try/catch so a logging failure can
    // never take down the fallback UI itself.
    try {
      logger.error('ErrorBoundary caught an error', {
        message: error?.message || String(error),
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      });
    } catch {
      // Swallow logging errors - the fallback UI must still render.
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, detailsOpen: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, detailsOpen } = this.state;

      // Defensively read details so a malformed error object can't crash
      // the fallback screen itself.
      let errorMessage = 'Unknown error';
      let errorStack = '';
      let componentStack = '';
      try {
        errorMessage = error?.message || String(error) || 'Unknown error';
        errorStack = typeof error?.stack === 'string' ? error.stack : '';
        componentStack = typeof errorInfo?.componentStack === 'string' ? errorInfo.componentStack : '';
      } catch {
        // Fall back to the defaults set above.
      }

      return (
        <section
          role="alert"
          aria-live="assertive"
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
            We encountered an unexpected error rendering this section. You can try again, reload the
            page, or view the technical details below if the problem continues.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleRetry}
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

          <details
            open={detailsOpen}
            style={{
              marginTop: '1.5rem',
              textAlign: 'left',
              maxWidth: '760px',
              marginInline: 'auto',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--card)'
            }}
          >
            <summary
              onClick={(e) => {
                // Drive expand/collapse from React state instead of relying
                // on the native <details> toggle, so behavior is consistent
                // and testable across environments.
                e.preventDefault();
                this.toggleDetails();
              }}
              role="button"
              tabIndex={0}
              aria-expanded={detailsOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.toggleDetails();
                }
              }}
              style={{
                cursor: 'pointer',
                fontWeight: '600',
                color: 'var(--ink, #0f172a)',
                userSelect: 'none'
              }}
            >
              {detailsOpen ? 'Hide error details' : 'Show error details'}
            </summary>
            <div style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Message:</strong> {errorMessage}
              </p>
              {errorStack && (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.8rem',
                    backgroundColor: 'color-mix(in srgb, var(--line) 25%, transparent)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    overflowX: 'auto'
                  }}
                >
                  {errorStack}
                </pre>
              )}
              {componentStack && (
                <>
                  <p style={{ margin: '0.75rem 0 0.5rem' }}>
                    <strong>Component stack:</strong>
                  </p>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.8rem',
                      backgroundColor: 'color-mix(in srgb, var(--line) 25%, transparent)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      overflowX: 'auto'
                    }}
                  >
                    {componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        </section>
      );
    }

    return this.props.children;
  }
}