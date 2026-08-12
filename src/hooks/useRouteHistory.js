import { useState } from 'react';

const HISTORY_STORAGE_KEY = "commute-route-history";
const SAVED_LOCATIONS_KEY = "commute-saved-locations";
const MAX_HISTORY = 10;

function readRouteHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readSavedLocations() {
  try {
    const raw = localStorage.getItem(SAVED_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useRouteHistory() {
  const [routeHistory, setRouteHistory] = useState(() => readRouteHistory());
  const [savedLocations, setSavedLocations] = useState(() => readSavedLocations());
  const [newLocationLabel, setNewLocationLabel] = useState("");

  const addHistoryEntry = (origin, destination) => {
    setRouteHistory((prev) => {
      const entry = { origin, destination, timestamp: new Date().toISOString() };
      const deduped = prev.filter(
        (item) => !(item.origin === origin && item.destination === destination)
      );
      const updated = [entry, ...deduped].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const saveLocation = (value) => {
    const label = newLocationLabel.trim();
    if (!label || !value.trim()) return;

    setSavedLocations((prev) => {
      const deduped = prev.filter(
        (loc) => loc.label.toLowerCase() !== label.toLowerCase()
      );
      const updated = [...deduped, { id: crypto.randomUUID(), label, value: value.trim() }];
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
    setNewLocationLabel("");
  };

  const deleteSavedLocation = (id) => {
    setSavedLocations((prev) => {
      const updated = prev.filter((loc) => loc.id !== id);
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    routeHistory,
    savedLocations,
    newLocationLabel,
    setNewLocationLabel,
    addHistoryEntry,
    saveLocation,
    deleteSavedLocation,
  };
}
