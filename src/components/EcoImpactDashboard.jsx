import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    readEcoTrips,
    logEcoTrip,
    filterToCurrentMonth,
    summarizeEcoImpact,
    TRIP_TYPES,
} from "../utils/ecoImpactStore";

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export default function EcoImpactDashboard() {
    const { t } = useTranslation();
    const [trips, setTrips] = useState(() => readEcoTrips());
    const [selectedType, setSelectedType] = useState("cycling");
    const [distanceKm, setDistanceKm] = useState("5");
    const [justLogged, setJustLogged] = useState(false);

    const monthlyTrips = useMemo(() => filterToCurrentMonth(trips), [trips]);
    const summary = useMemo(() => summarizeEcoImpact(monthlyTrips), [monthlyTrips]);

    const chartData = useMemo(
        () => [
            { name: t("ecoImpact.chartCycling", "Cycling"), count: summary.cyclingCount },
            { name: t("ecoImpact.chartTransit", "Public transport"), count: summary.publicTransportCount },
            { name: t("ecoImpact.chartCarAvoided", "Car avoided"), count: summary.carAvoidedCount },
        ],
        [summary, t],
    );

    function handleLogTrip(event) {
        event.preventDefault();
        const parsedDistance = parseFloat(distanceKm);
        logEcoTrip(selectedType, Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : undefined);
        setTrips(readEcoTrips());
        setJustLogged(true);
        setTimeout(() => setJustLogged(false), 2500);
    }

    return (
        <section data-testid="eco-impact-dashboard" className="panel eco-impact-dashboard">
            <div className="panel-head">
                <h2>{t("ecoImpact.title", "🏆 Your Eco Impact")}</h2>
                <p>{t("ecoImpact.subtitle", "This Month — {{month}}", { month: MONTH_FORMATTER.format(new Date()) })}</p>
            </div>

            <form className="eco-impact-log-form" onSubmit={handleLogTrip}>
                <label htmlFor="eco-trip-type">{t("ecoImpact.tripTypeLabel", "Log a trip")}</label>
                <select
                    id="eco-trip-type"
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value)}
                >
                    {Object.values(TRIP_TYPES).map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.icon} {t(`ecoImpact.tripType.${type.id}`, type.label)}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={distanceKm}
                    onChange={(event) => setDistanceKm(event.target.value)}
                    aria-label={t("ecoImpact.distanceLabel", "Distance in kilometers")}
                    placeholder={t("ecoImpact.distancePlaceholder", "Distance (km)")}
                />
                <button type="submit">{t("ecoImpact.logButton", "Log Trip")}</button>
            </form>
            {justLogged && (
                <p className="eco-impact-logged-note" role="status" data-testid="eco-trip-logged-note">
                    {t("ecoImpact.loggedNote", "Trip logged! Your impact below has been updated.")}
                </p>
            )}

            <div className="eco-impact-stats-grid">
                <div className="eco-impact-stat" data-testid="stat-cycling">
                    <span className="eco-impact-stat-icon">🚲</span>
                    <span className="eco-impact-stat-value">{summary.cyclingCount}</span>
                    <span className="eco-impact-stat-label">{t("ecoImpact.cyclingTrips", "Cycling trips")}</span>
                </div>
                <div className="eco-impact-stat" data-testid="stat-transit">
                    <span className="eco-impact-stat-icon">🚌</span>
                    <span className="eco-impact-stat-value">{summary.publicTransportCount}</span>
                    <span className="eco-impact-stat-label">{t("ecoImpact.transitTrips", "Public transport")}</span>
                </div>
                <div className="eco-impact-stat" data-testid="stat-car-avoided">
                    <span className="eco-impact-stat-icon">🚗</span>
                    <span className="eco-impact-stat-value">{summary.carAvoidedCount}</span>
                    <span className="eco-impact-stat-label">{t("ecoImpact.carTripsAvoided", "Car trips avoided")}</span>
                </div>
            </div>

            <div className="eco-impact-estimates">
                <h3>{t("ecoImpact.estimatedHeading", "Estimated")}</h3>
                <div className="eco-impact-estimates-grid">
                    <div className="eco-impact-estimate" data-testid="stat-co2-avoided">
                        <span className="eco-impact-stat-icon">🌱</span>
                        <span>
                            {t("ecoImpact.co2Avoided", "CO₂ avoided: {{kg}} kg", { kg: summary.co2AvoidedKg.toFixed(1) })}
                        </span>
                    </div>
                    <div className="eco-impact-estimate" data-testid="stat-distance-avoided">
                        <span className="eco-impact-stat-icon">🚘</span>
                        <span>
                            {t("ecoImpact.distanceAvoided", "Car distance avoided: {{km}} km", { km: summary.carDistanceAvoidedKm.toFixed(0) })}
                        </span>
                    </div>
                </div>
            </div>

            {summary.totalTrips > 0 ? (
                <div className="eco-impact-chart" style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis allowDecimals={false} fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="eco-impact-empty">
                    {t("ecoImpact.empty", "Log your first eco-friendly trip above to start tracking your impact.")}
                </p>
            )}
        </section>
    );
}