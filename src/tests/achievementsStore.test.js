// @vitest-environment node
import { test, expect, beforeEach, afterEach } from "vitest";
import { eventBus } from "../core/events";
import { getEarnedBadges } from "../utils/achievementsStore";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      return Object.keys(store)[index] || null;
    },
  };
})();

global.localStorage = localStorageMock;

let activeTestListeners = [];

beforeEach(() => {
  localStorage.clear();
  activeTestListeners = [];
});

afterEach(() => {
  // Clean up test listeners to avoid pollution
  activeTestListeners.forEach(({ event, fn }) => {
    eventBus.off(event, fn);
  });
});

function registerTestListener(event, fn) {
  eventBus.on(event, fn);
  activeTestListeners.push({ event, fn });
}

test("unlocks Mission Commander and Smog Slayer badges", async () => {
  const earnedBefore = getEarnedBadges();
  expect(earnedBefore["mission-commander"]).toBeUndefined();
  expect(earnedBefore["smog-slayer"]).toBeUndefined();

  /** @type {any} */
  let earnedEvent = null;
  registerTestListener("BADGE_EARNED", (badge) => {
    earnedEvent = badge;
  });

  // Emit success on easy mission
  eventBus.emit("AQI_MISSION_COMPLETED", {
    success: true,
    missionId: "easy_rescue"
  });

  expect(getEarnedBadges()["mission-commander"]).toBeDefined();
  expect(earnedEvent?.id).toBe("mission-commander");

  earnedEvent = null;
  // Emit success on hard mission
  eventBus.emit("AQI_MISSION_COMPLETED", {
    success: true,
    missionId: "hard_crisis"
  });

  expect(getEarnedBadges()["smog-slayer"]).toBeDefined();
  expect(earnedEvent?.id).toBe("smog-slayer");
});

test("unlocks Hotspot Hunter and Perfect Scout badges", async () => {
  let earnedBadges = [];
  registerTestListener("BADGE_EARNED", (badge) => {
    earnedBadges.push(badge.id);
  });

  // Emit completion with score 2 (no badges)
  eventBus.emit("HOTSPOT_SCOUT_COMPLETED", { score: 2, totalRounds: 5 });
  expect(earnedBadges).toEqual([]);

  // Emit completion with score 4 (Hotspot Hunter)
  eventBus.emit("HOTSPOT_SCOUT_COMPLETED", { score: 4, totalRounds: 5 });
  expect(earnedBadges).toContain("hotspot-hunter");
  expect(earnedBadges).not.toContain("perfect-scout");

  // Emit completion with score 5 (Perfect Scout)
  eventBus.emit("HOTSPOT_SCOUT_COMPLETED", { score: 5, totalRounds: 5 });
  expect(earnedBadges).toContain("perfect-scout");
});

test("unlocks River Explorer and River Master badges", async () => {
  let earnedBadges = [];
  registerTestListener("BADGE_EARNED", (badge) => {
    earnedBadges.push(badge.id);
  });

  // Emit completion with 4 mistakes (no badges)
  eventBus.emit("RIVER_ORIGIN_COMPLETED", { mistakes: 4, totalRivers: 6 });
  expect(earnedBadges).toEqual([]);

  // Emit completion with 2 mistakes (River Explorer)
  eventBus.emit("RIVER_ORIGIN_COMPLETED", { mistakes: 2, totalRivers: 6 });
  expect(earnedBadges).toContain("river-explorer");
  expect(earnedBadges).not.toContain("river-master");

  // Emit completion with 0 mistakes (River Master)
  eventBus.emit("RIVER_ORIGIN_COMPLETED", { mistakes: 0, totalRivers: 6 });
  expect(earnedBadges).toContain("river-master");
});
