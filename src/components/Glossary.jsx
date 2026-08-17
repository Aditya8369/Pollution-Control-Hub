import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import "./Glossary.css";
import glossaryData from "../data/glossary.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",         label: "All",           emoji: "🌐" },
  { id: "pollutant",  label: "Pollutants",     emoji: "💨" },
  { id: "measurement",label: "Measurement",    emoji: "📏" },
  { id: "health",     label: "Health",         emoji: "🫁" },
  { id: "climate",    label: "Climate",        emoji: "🌡️" },
  { id: "phenomenon", label: "Phenomena",      emoji: "🌫️" },
  { id: "regulation", label: "Regulation",     emoji: "📋" },
  { id: "source",     label: "Sources",        emoji: "🏭" },
];

const CATEGORY_COLORS = {
  pollutant:   { bg: "rgba(239,68,68,0.12)",  border: "#ef4444", badge: "#dc2626", text: "#fca5a5" },
  measurement: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", badge: "#2563eb", text: "#93c5fd" },
  health:      { bg: "rgba(168,85,247,0.12)", border: "#a855f7", badge: "#9333ea", text: "#d8b4fe" },
  climate:     { bg: "rgba(34,197,94,0.12)",  border: "#22c55e", badge: "#16a34a", text: "#86efac" },
  phenomenon:  { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", badge: "#d97706", text: "#fcd34d" },
  regulation:  { bg: "rgba(20,184,166,0.12)", border: "#14b8a6", badge: "#0d9488", text: "#5eead4" },
  source:      { bg: "rgba(249,115,22,0.12)", border: "#f97316", badge: "#ea580c", text: "#fdba74" },
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ITEMS_PER_PAGE = 20;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Highlighted search match inside text */
function Highlight({ text, query }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="glossary-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Single glossary term card (collapsed) */
function GlossaryCard({ entry, query, isExpanded, onToggle }) {
  const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.pollutant;

  return (
    <article
      className={`glossary-card${isExpanded ? " glossary-card--expanded" : ""}`}
      style={{ borderColor: isExpanded ? colors.border : undefined }}
    >
      {/* aria-expanded sat on the <article>, where it is ignored — the state was never
          announced. It belongs on the control that does the toggling, pointing at the
          region it reveals. */}
      <button
        type="button"
        className="glossary-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`glossary-card-body-${entry.term}`}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} definition of ${entry.term}`}
      >
        <div className="glossary-card-title-row">
          <div className="glossary-card-term-group">
            <span
              className="glossary-card-term"
              style={{ color: isExpanded ? colors.border : undefined }}
            >
              <Highlight text={entry.term} query={query} />
            </span>
            {entry.fullForm && entry.fullForm !== entry.term && (
              <span className="glossary-card-fullform">
                <Highlight text={entry.fullForm} query={query} />
              </span>
            )}
          </div>
          <div className="glossary-card-meta">
            <span
              className="glossary-category-badge"
              style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
            >
              {CATEGORIES.find(c => c.id === entry.category)?.emoji}{" "}
              {CATEGORIES.find(c => c.id === entry.category)?.label ?? entry.category}
            </span>
            <span className={`glossary-chevron${isExpanded ? " glossary-chevron--up" : ""}`} aria-hidden="true">
              ▾
            </span>
          </div>
        </div>
        {!isExpanded && (
          <p className="glossary-card-preview">
            <Highlight text={entry.definition.slice(0, 120) + (entry.definition.length > 120 ? "…" : "")} query={query} />
          </p>
        )}
      </button>

      {isExpanded && (
        <div className="glossary-card-body" id={`glossary-card-body-${entry.term}`}>
          <p className="glossary-definition">
            <Highlight text={entry.definition} query={query} />
          </p>

          {entry.example && (
            <div className="glossary-example-box">
              <span className="glossary-example-label">💡 Example</span>
              <p className="glossary-example-text">
                <Highlight text={entry.example} query={query} />
              </p>
            </div>
          )}

          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div className="glossary-related">
              <span className="glossary-related-label">Related:</span>
              <div className="glossary-related-chips">
                {entry.relatedTerms.map(rel => (
                  <span key={rel} className="glossary-related-chip">{rel}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Alphabet quick-jump bar */
function AlphabetNav({ available, onJump }) {
  return (
    <nav className="glossary-alpha-nav" aria-label="Jump to letter">
      {ALPHABET.map(letter => {
        const active = available.has(letter);
        return (
          <button
            key={letter}
            type="button"
            className={`glossary-alpha-btn${active ? "" : " glossary-alpha-btn--disabled"}`}
            disabled={!active}
            onClick={() => active && onJump(letter)}
            aria-label={`Jump to terms starting with ${letter}`}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}

/** Empty state when no results match */
function EmptyState({ query, category }) {
  return (
    <div className="glossary-empty">
      <span className="glossary-empty-icon">🔍</span>
      <h3 className="glossary-empty-title">No terms found</h3>
      <p className="glossary-empty-text">
        {query
          ? `No glossary entries match "${query}"${category !== "all" ? ` in the "${CATEGORIES.find(c => c.id === category)?.label}" category` : ""}.`
          : `No entries in the selected category.`}
      </p>
      <p className="glossary-empty-hint">Try a broader search or switch to "All" categories.</p>
    </div>
  );
}

/** Stats bar showing match count */
function StatsBar({ total, filtered, category, query }) {
  const categoryLabel = CATEGORIES.find(c => c.id === category)?.label ?? category;
  return (
    <div className="glossary-stats-bar" aria-live="polite" aria-atomic="true">
      <span className="glossary-stats-count">
        <strong>{filtered}</strong> {filtered === 1 ? "term" : "terms"}
        {filtered !== total && ` of ${total}`}
      </span>
      {(query || category !== "all") && (
        <span className="glossary-stats-filter">
          {query && <span>matching <em>"{query}"</em></span>}
          {query && category !== "all" && " · "}
          {category !== "all" && <span>in <em>{categoryLabel}</em></span>}
        </span>
      )}
    </div>
  );
}

/** Category filter pills */
function CategoryFilter({ activeCategory, onSelect, counts }) {
  return (
    <div className="glossary-category-filter" role="group" aria-label="Filter by category">
      {CATEGORIES.map(cat => {
        const count = cat.id === "all" ? counts.total : (counts[cat.id] ?? 0);
        const isActive = activeCategory === cat.id;
        const colors = CATEGORY_COLORS[cat.id];
        return (
          <button
            key={cat.id}
            type="button"
            className={`glossary-cat-btn${isActive ? " glossary-cat-btn--active" : ""}`}
            style={
              isActive && colors
                ? { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }
                : {}
            }
            onClick={() => onSelect(cat.id)}
            aria-pressed={isActive}
          >
            <span className="glossary-cat-emoji">{cat.emoji}</span>
            {cat.label}
            <span className="glossary-cat-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Glossary() {
  const [query, setQuery]             = useState("");
  const [category, setCategory]       = useState("all");
  const [expandedId, setExpandedId]   = useState(null);
  const [sortBy, setSortBy]           = useState("alpha");  // "alpha" | "category"
  const [page, setPage]               = useState(1);
  const [jumpLetter, setJumpLetter]   = useState(null);

  const searchRef    = useRef(null);
  const resultsRef   = useRef(null);
  const letterRefs   = useRef({});

  // ── Focus search on mount ──
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // ── Reset pagination on filter change ──
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [query, category, sortBy]);

  // ── Jump to letter ──
  useEffect(() => {
    if (!jumpLetter) return;
    const el = letterRefs.current[jumpLetter];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setJumpLetter(null);
  }, [jumpLetter]);

  // ── Keyboard shortcut: / to focus search ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Category counts (unfiltered by text, for the filter bar) ──
  const categoryCounts = useMemo(() => {
    const counts = { total: glossaryData.length };
    glossaryData.forEach(e => {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    });
    return counts;
  }, []);

  // ── Filtered & sorted entries ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = glossaryData.filter(entry => {
      const matchesCategory = category === "all" || entry.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        entry.term.toLowerCase().includes(q) ||
        entry.fullForm?.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.example?.toLowerCase().includes(q) ||
        entry.relatedTerms?.some(r => r.toLowerCase().includes(q))
      );
    });

    if (sortBy === "alpha") {
      list = list.sort((a, b) => a.term.localeCompare(b.term));
    } else {
      list = list.sort((a, b) =>
        a.category.localeCompare(b.category) || a.term.localeCompare(b.term)
      );
    }
    return list;
  }, [query, category, sortBy]);

  // ── Available first letters (for alpha nav) ──
  const availableLetters = useMemo(() => {
    const set = new Set();
    filtered.forEach(e => {
      const first = e.term[0]?.toUpperCase();
      if (first && /[A-Z]/.test(first)) set.add(first);
    });
    return set;
  }, [filtered]);

  // ── Paginated slice ──
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Grouped by first letter (for headings when sorted alpha) ──
  const groupedByLetter = useMemo(() => {
    if (sortBy !== "alpha") return null;
    const groups = {};
    paginated.forEach(entry => {
      const letter = entry.term[0]?.toUpperCase() ?? "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(entry);
    });
    return groups;
  }, [paginated, sortBy]);

  // ── Handlers ──
  const handleToggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleClearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };

  const handleJumpToLetter = (letter) => {
    setJumpLetter(letter);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section
      className="glossary-container"
      aria-labelledby="glossary-heading"
      data-testid="glossary-page"
    >
      {/* ── Header ── */}
      <div className="glossary-header-card">
        <div className="glossary-header-badge">📖 Reference Guide</div>
        <h2 id="glossary-heading" className="glossary-title">
          Pollution &amp; Air Quality Glossary
        </h2>
        <p className="glossary-subtitle">
          A comprehensive reference of{" "}
          <strong>{glossaryData.length} key terms</strong> spanning pollutants,
          health effects, climate science, measurement standards, and regulatory
          frameworks. Use the search and filters below to find what you need.
        </p>

        {/* ── Quick stats chips ── */}
        <div className="glossary-quick-stats">
          {CATEGORIES.filter(c => c.id !== "all").map(cat => (
            <button
              key={cat.id}
              type="button"
              className="glossary-quick-stat-chip"
              onClick={() => {
                setCategory(cat.id);
                resultsRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                borderColor: CATEGORY_COLORS[cat.id]?.border,
                color: CATEGORY_COLORS[cat.id]?.text,
                backgroundColor: CATEGORY_COLORS[cat.id]?.bg,
              }}
            >
              {cat.emoji} {cat.label}
              <span className="glossary-quick-stat-num">
                {categoryCounts[cat.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="glossary-search-bar">
        <label htmlFor="glossary-search-input" className="sr-only">
          Search glossary terms
        </label>
        <div className="glossary-search-wrapper">
          <span className="glossary-search-icon" aria-hidden="true">🔍</span>
          <input
            id="glossary-search-input"
            ref={searchRef}
            type="search"
            className="glossary-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search terms, definitions, examples… (Press "/" to focus)'
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="glossary-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="glossary-search-hint">
          <kbd>/</kbd> to search · <kbd>Esc</kbd> to clear
        </div>
      </div>

      {/* ── Category Filter ── */}
      <CategoryFilter
        activeCategory={category}
        onSelect={setCategory}
        counts={categoryCounts}
      />

      {/* ── Controls row: sort + alpha nav ── */}
      <div className="glossary-controls-row" ref={resultsRef}>
        <div className="glossary-sort-group">
          <span className="glossary-sort-label">Sort:</span>
          <button
            type="button"
            className={`glossary-sort-btn${sortBy === "alpha" ? " glossary-sort-btn--active" : ""}`}
            onClick={() => setSortBy("alpha")}
          >
            A–Z
          </button>
          <button
            type="button"
            className={`glossary-sort-btn${sortBy === "category" ? " glossary-sort-btn--active" : ""}`}
            onClick={() => setSortBy("category")}
          >
            By Category
          </button>
        </div>

        <StatsBar
          total={glossaryData.length}
          filtered={filtered.length}
          category={category}
          query={query}
        />
      </div>

      {/* ── Alphabet nav (only in alpha mode without search) ── */}
      {sortBy === "alpha" && !query && (
        <AlphabetNav available={availableLetters} onJump={handleJumpToLetter} />
      )}

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <EmptyState query={query} category={category} />
      ) : sortBy === "alpha" && groupedByLetter ? (
        /* Grouped by letter */
        <div className="glossary-results">
          {Object.entries(groupedByLetter).map(([letter, entries]) => (
            <div
              key={letter}
              className="glossary-letter-group"
              ref={el => { letterRefs.current[letter] = el; }}
            >
              <div className="glossary-letter-heading" aria-label={`Terms starting with ${letter}`}>
                {letter}
              </div>
              {entries.map(entry => (
                <GlossaryCard
                  key={entry.term}
                  entry={entry}
                  query={query}
                  isExpanded={expandedId === entry.term}
                  onToggle={() => handleToggle(entry.term)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Flat list (category sort or search active) */
        <div className="glossary-results">
          {paginated.map(entry => (
            <GlossaryCard
              key={entry.term}
              entry={entry}
              query={query}
              isExpanded={expandedId === entry.term}
              onToggle={() => handleToggle(entry.term)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <nav className="glossary-pagination" aria-label="Glossary pages">
          <button
            type="button"
            className="glossary-page-btn"
            disabled={page === 1}
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: resultsRef.current?.offsetTop ?? 0, behavior: "smooth" }); }}
            aria-label="Previous page"
          >
            ← Prev
          </button>

          <div className="glossary-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .reduce((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`ellipsis-${i}`} className="glossary-page-ellipsis">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`glossary-page-num${page === item ? " glossary-page-num--active" : ""}`}
                    onClick={() => { setPage(item); window.scrollTo({ top: resultsRef.current?.offsetTop ?? 0, behavior: "smooth" }); }}
                    aria-label={`Page ${item}`}
                    aria-current={page === item ? "page" : undefined}
                  >
                    {item}
                  </button>
                )
              )
            }
          </div>

          <button
            type="button"
            className="glossary-page-btn"
            disabled={page === totalPages}
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: resultsRef.current?.offsetTop ?? 0, behavior: "smooth" }); }}
            aria-label="Next page"
          >
            Next →
          </button>

          <span className="glossary-page-info">
            Page {page} of {totalPages}
          </span>
        </nav>
      )}

      {/* ── Footer note ── */}
      <div className="glossary-footer-note">
        <p>
          📚 Definitions are based on WHO, EPA, and CPCB guidelines. This glossary is
          maintained as part of the Pollution Control Hub open-source project.
        </p>
      </div>
    </section>
  );
}
