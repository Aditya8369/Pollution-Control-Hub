import { useState, useEffect } from "react";
import facts from "../data/facts.json";

/** @param {any} params */
export default function Factoid({ label = "Did You Know?" }) {
    const [fact, setFact] = useState(
        () => facts[Math.floor(Math.random() * facts.length)]
    );

    useEffect(() => {
        setFact(facts[Math.floor(Math.random() * facts.length)]);
    }, []);

    return (
        <div className="factoid-card">
            <span className="factoid-label">{label}</span>
            <p className="factoid-text">{fact}</p>
        </div>
    );
}