import { useState, useMemo } from "react";
import { shuffleArray } from "./hotspotGameUtils";

const RIVERS = [
    {
        id: "ganga",
        name: "Ganga",
        origin: "Gangotri Glacier, Uttarakhand",
        pollutionLevel: "Critically Polluted",
        conservationStatus: "Namami Gange Mission (Ongoing)",
    },
    {
        id: "yamuna",
        name: "Yamuna",
        origin: "Yamunotri Glacier, Uttarakhand",
        pollutionLevel: "Critically Polluted",
        conservationStatus: "Yamuna Action Plan (Ongoing)",
    },
    {
        id: "godavari",
        name: "Godavari",
        origin: "Trimbakeshwar, Maharashtra",
        pollutionLevel: "Moderately Polluted",
        conservationStatus: "Godavari River Conservation Plan",
    },
    {
        id: "narmada",
        name: "Narmada",
        origin: "Amarkantak, Madhya Pradesh",
        pollutionLevel: "Moderately Polluted",
        conservationStatus: "Narmada Conservation Mission",
    },
    {
        id: "krishna",
        name: "Krishna",
        origin: "Mahabaleshwar, Maharashtra",
        pollutionLevel: "Moderately Polluted",
        conservationStatus: "Krishna River Basin Plan",
    },
    {
        id: "brahmaputra",
        name: "Brahmaputra",
        origin: "Angsi Glacier, Tibet",
        pollutionLevel: "Relatively Clean",
        conservationStatus: "Brahmaputra Board Initiatives",
    },
];

const BEST_MISTAKES_KEY = "river-origin-best-mistakes";

function getBestMistakes() {
    try {
        const raw = localStorage.getItem(BEST_MISTAKES_KEY);
        return raw !== null ? parseInt(raw, 10) : null;
    } catch {
        return null;
    }
}

/** @param {number} mistakes */
function saveBestMistakes(mistakes) {
    try {
        const current = getBestMistakes();
        if (current === null || mistakes < current) {
            localStorage.setItem(BEST_MISTAKES_KEY, String(mistakes));
            return mistakes;
        }
        return current;
    } catch {
        return mistakes;
    }
}

export default function RiverOriginGame() {
    const [riverOrder, setRiverOrder] = useState(() => shuffleArray(RIVERS));
    const [originOrder, setOriginOrder] = useState(() => shuffleArray(RIVERS));
    const [matchedIds, setMatchedIds] = useState(() => new Set());
    const [selectedRiverId, setSelectedRiverId] = useState(null);
    const [wrongPair, setWrongPair] = useState(null);
    const [mistakes, setMistakes] = useState(0);
    const [bestMistakes, setBestMistakes] = useState(() => getBestMistakes());
    const matchedRivers = useMemo(
        () => RIVERS.filter((r) => matchedIds.has(r.id)),
        [matchedIds]
    );

    const gameComplete = matchedIds.size === RIVERS.length;

    const handleRiverClick = (id) => {
        if (matchedIds.has(id) || wrongPair) return;
        setSelectedRiverId((prev) => (prev === id ? null : id));
    };

    const handleOriginClick = (originRiverId) => {
        if (matchedIds.has(originRiverId) || !selectedRiverId || wrongPair) return;

        if (selectedRiverId === originRiverId) {
            const updated = new Set(matchedIds);
            updated.add(originRiverId);
            setMatchedIds(updated);
            setSelectedRiverId(null);

            if (updated.size === RIVERS.length) {
                setBestMistakes(saveBestMistakes(mistakes));
            }
        } else {
            setMistakes((prev) => prev + 1);
            setWrongPair({ river: selectedRiverId, origin: originRiverId });
            setTimeout(() => {
                setWrongPair(null);
                setSelectedRiverId(null);
            }, 400);
        }
    };

    const handlePlayAgain = () => {
        setRiverOrder(shuffleArray(RIVERS));
        setOriginOrder(shuffleArray(RIVERS));
        setMatchedIds(new Set());
        setSelectedRiverId(null);
        setWrongPair(null);
        setMistakes(0);
    };

    return (
        <div className="river-game">
            <h2>River Origin Challenge</h2>
            <p className="river-game-instructions">
                Match each Indian river to its true point of origin. Select a river, then select its matching origin.
            </p>

            <div className="river-score-board">
                <span>Matched: {matchedIds.size}/{RIVERS.length}</span>
                <span>Mistakes: {mistakes}</span>
                <span>Best Run: {bestMistakes === null ? "—" : `${bestMistakes} mistake${bestMistakes === 1 ? "" : "s"}`}</span>
                <button type="button" className="river-reset-btn" onClick={handlePlayAgain}>
                    Reset
                </button>
            </div>

            <div className="river-match-grid">
                <div>
                    <div className="river-column-title">Rivers</div>
                    <div className="river-card-list">
                        {riverOrder.map((river) => {
                            const isMatched = matchedIds.has(river.id);
                            const isSelected = selectedRiverId === river.id;
                            const isWrong = wrongPair?.river === river.id;
                            return (
                                <button
                                    key={river.id}
                                    type="button"
                                    className={`river-card${isMatched ? " matched" : ""}${isSelected ? " selected" : ""}${isWrong ? " wrong" : ""}`}
                                    onClick={() => handleRiverClick(river.id)}
                                    disabled={isMatched}
                                >
                                    {river.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <div className="river-column-title">Origin Points</div>
                    <div className="river-card-list">
                        {originOrder.map((river) => {
                            const isMatched = matchedIds.has(river.id);
                            const isWrong = wrongPair?.origin === river.id;
                            return (
                                <button
                                    key={river.id}
                                    type="button"
                                    className={`river-card${isMatched ? " matched" : ""}${isWrong ? " wrong" : ""}`}
                                    onClick={() => handleOriginClick(river.id)}
                                    disabled={isMatched}
                                >
                                    {river.origin}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {matchedRivers.length > 0 && (
                <div className="river-facts">
                    {matchedRivers.map((river) => (
                        <div key={river.id} className="river-fact-item">
                            <strong>{river.name}</strong> — Pollution level: {river.pollutionLevel}. Conservation: {river.conservationStatus}.
                        </div>
                    ))}
                </div>
            )}

            {gameComplete && (
                <div className="river-modal-overlay">
                    <div className="river-modal">
                        <h3>All Rivers Matched!</h3>
                        <p>Mistakes this run: <strong>{mistakes}</strong></p>
                        <p>Best Run: <strong>{bestMistakes === null ? "—" : `${bestMistakes} mistake${bestMistakes === 1 ? "" : "s"}`}</strong></p>
                        <div className="river-modal-actions">
                            <button type="button" className="btn-primary" onClick={handlePlayAgain}>
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}