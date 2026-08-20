import { useState } from "react";
import PropTypes from "prop-types";

function formatValue(value, unit) {
    if (value === null || value === undefined || value === "") return "—";
    return `${value} ${unit}`;
}

/**
 * Side-by-side comparison of every evaluated route — distance, time, average
 * AQI exposure along the route, and estimated inhaled dose — with the
 * recommended (cleanest measured) route flagged. Complements RouteResults'
 * pick-one list with a comparison view (issue #864, step 12).
 */
export default function RouteComparison({ routes = [], activeRouteIndex = 0, setActiveRouteIndex }) {
    const [isOpen, setIsOpen] = useState(true);

    if (routes.length < 2) return null;

    const recommendedIndex = routes.findIndex((r) => r.measured !== false);

    return (
        <div className="commute-comparison" data-testid="route-comparison">
            <button
                type="button"
                className="commute-comparison-toggle"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
            >
                {isOpen ? "▾" : "▸"} Compare Routes ({routes.length})
            </button>

            {isOpen && (
                <div className="commute-comparison-table-wrap">
                    <table className="commute-comparison-table" data-testid="route-comparison-table">
                        <thead>
                            <tr>
                                <th>Route</th>
                                <th>Distance</th>
                                <th>Duration</th>
                                <th>Avg AQI Exposure</th>
                                <th>Inhaled Dose</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.map((route, idx) => {
                                const isRecommended = idx === recommendedIndex;
                                const isActive = idx === activeRouteIndex;
                                const exposureScoreDisplay =
                                    route.measured === false || route.exposureScore == null
                                        ? null
                                        : Math.round(route.exposureScore);

                                return (
                                    <tr
                                        key={idx}
                                        className={`${isActive ? "commute-comparison-row--active" : ""} ${isRecommended ? "commute-comparison-row--recommended" : ""}`}
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="commute-comparison-select"
                                                onClick={() => setActiveRouteIndex(idx)}
                                            >
                                                Route {idx + 1}
                                            </button>
                                        </td>
                                        <td>{formatValue(route.distance, "km")}</td>
                                        <td>{formatValue(route.duration, "min")}</td>
                                        <td>
                                            {route.measured === false
                                                ? "No reading"
                                                : `AQI exposure ${exposureScoreDisplay}`}
                                        </td>
                                        <td>{formatValue(route.inhaledDose, "µg")}</td>
                                        <td>
                                            {isRecommended && (
                                                <span className="commute-comparison-badge">Recommended</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

RouteComparison.propTypes = {
    routes: PropTypes.array,
    activeRouteIndex: PropTypes.number,
    setActiveRouteIndex: PropTypes.func.isRequired,
};