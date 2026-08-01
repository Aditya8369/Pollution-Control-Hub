import React, { useState, useEffect, useRef } from 'react';
import {
  REDUCTION_TIPS,
  GOVERNMENT_POLICIES,
  EDUCATIONAL_READS,
} from '../constants/solutionsData';
import { useLocalStorageSet } from '../hooks/useLocalStorageSet';

export default function SolutionsAwareness() {
  // Policy Accordion state (only one card expanded at a time)
  const [expandedPolicyId, setExpandedPolicyId] = useState(null);

  // Tips bookmark local storage persistence using custom hook
  const bookmarkedTips = useLocalStorageSet('pollutionHub.bookmarkedTips');

  // Modal state & focus management
  const [activeArticle, setActiveArticle] = useState(null);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastActiveElementRef = useRef(null);

  const togglePolicy = (id) => {
    setExpandedPolicyId((prevId) => (prevId === id ? null : id));
  };

  const openArticleModal = (article, event) => {
    lastActiveElementRef.current = event?.currentTarget || document.activeElement;
    setActiveArticle(article);
  };

  const closeArticleModal = () => {
    setActiveArticle(null);
    if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
      lastActiveElementRef.current.focus();
    }
  };

  // Keyboard trap and Escape key listener for modal
  useEffect(() => {
    if (!activeArticle) return;

    // Focus close button on modal mount
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeArticleModal();
        return;
      }

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            lastElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeArticle]);

  return (
    <section data-testid="solutions-awareness" className="panel solutions-awareness-section">
      <div className="panel-head">
        <h2>Solutions & Awareness</h2>
        <p>Interactive action tips, policy framework insights, and educational learning resources</p>
      </div>

      <div className="three-col solutions-three-col">
        {/* Column 1: Interactive Pollution Reduction Tips */}
        <div className="solutions-col">
          <div className="solutions-col-header sa-col-header">
            <h3>Ways to Reduce Pollution</h3>
          </div>

          <div className="sa-tips-list" role="list">
            {REDUCTION_TIPS.map((tip) => {
              const isBookmarked = bookmarkedTips.has(tip.id);

              return (
                <article
                  key={tip.id}
                  className="sa-tip-card"
                  role="listitem"
                >
                  <div className="sa-tip-card-header">
                    <span className="sa-tip-category-badge">{tip.category}</span>
                  </div>

                  <h4 className="sa-tip-title">{tip.title}</h4>
                  <p className="sa-tip-description">{tip.description}</p>

                  <div className="sa-tip-actions">
                    <button
                      type="button"
                      className={`sa-tip-action-btn ${isBookmarked ? 'sa-tip-btn-active' : ''}`}
                      onClick={() => bookmarkedTips.toggle(tip.id)}
                      aria-label={isBookmarked ? `Remove bookmark for ${tip.title}` : `Bookmark ${tip.title}`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark this tip'}
                    >
                      {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Column 2: Expandable Government Policy Cards */}
        <div className="solutions-col">
          <div className="solutions-col-header sa-col-header">
            <h3>Government Policies</h3>
            <span className="solutions-subtext sa-subtext">Click card to expand</span>
          </div>

          <div className="sa-policy-accordion" role="list">
            {GOVERNMENT_POLICIES.map((policy) => {
              const isExpanded = expandedPolicyId === policy.id;

              return (
                <div
                  key={policy.id}
                  className={`sa-policy-card ${isExpanded ? 'sa-policy-card-expanded' : ''}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="sa-policy-header-btn"
                    onClick={() => togglePolicy(policy.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`policy-body-${policy.id}`}
                  >
                    <span className="sa-policy-title">{policy.title}</span>
                    <span className={`sa-policy-chevron ${isExpanded ? 'sa-chevron-rotated' : ''}`} aria-hidden="true">
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`policy-body-${policy.id}`}
                      className="sa-policy-body"
                      role="region"
                      aria-label={policy.title}
                    >
                      <p className="sa-policy-desc">{policy.description}</p>

                      <div className="sa-policy-detail-block">
                        <strong>Objective:</strong>
                        <p>{policy.objective}</p>
                      </div>

                      <div className="sa-policy-detail-block">
                        <strong>Impact:</strong>
                        <p>{policy.impact}</p>
                      </div>

                      {policy.url && (
                        <a
                          href={policy.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sa-policy-learn-more-link"
                        >
                          Learn More Official Resource ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Educational Reads */}
        <div className="solutions-col">
          <div className="solutions-col-header sa-col-header">
            <h3>Educational Reads</h3>
            <span className="solutions-subtext sa-subtext">Click card to open article</span>
          </div>

          <div className="sa-reads-list" role="list">
            {EDUCATIONAL_READS.map((read) => (
              <button
                type="button"
                key={read.id}
                className="sa-read-card-btn"
                onClick={(e) => openArticleModal(read, e)}
                role="listitem"
                aria-haspopup="dialog"
              >
                <div className="sa-read-meta">
                  <span className="sa-read-source-tag">{read.source}</span>
                  <span className="sa-read-time-tag">{read.readTime}</span>
                </div>
                <h4 className="sa-read-title">{read.title}</h4>
                <p className="sa-read-snippet">{read.summary}</p>
                <span className="sa-read-cta-text">Read Article Summary →</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightweight Accessible Educational Article Modal */}
      {activeArticle && (
        <div
          className="sa-article-modal-backdrop"
          onClick={closeArticleModal}
          role="presentation"
        >
          <div
            ref={modalRef}
            className="sa-article-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-article-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeBtnRef}
              type="button"
              className="sa-article-modal-close-btn"
              onClick={closeArticleModal}
              aria-label="Close educational article modal"
            >
              ✕
            </button>

            <div className="sa-article-modal-header">
              <div className="sa-read-meta">
                <span className="sa-read-source-tag">{activeArticle.source}</span>
                <span className="sa-read-time-tag">{activeArticle.readTime}</span>
              </div>
              <h3 id="sa-article-modal-title" className="sa-article-modal-title">
                {activeArticle.title}
              </h3>
            </div>

            <div className="sa-article-modal-body">
              <div className="sa-modal-section">
                <h4>Summary</h4>
                <p>{activeArticle.summary}</p>
              </div>

              <div className="sa-modal-section sa-modal-key-takeaway">
                <h4>Key Takeaway</h4>
                <p>{activeArticle.keyTakeaway}</p>
              </div>
            </div>

            <div className="sa-article-modal-footer">
              <button
                type="button"
                className="sa-modal-btn-secondary"
                onClick={closeArticleModal}
              >
                Close
              </button>
              <a
                href={activeArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sa-modal-btn-primary"
              >
                Read Full Article ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
