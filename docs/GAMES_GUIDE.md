# 🎮 Pollution Control Hub - Educational Games Guide

Welcome to the Educational Games documentation! This guide is designed for educators, contributors, and players who want to understand the mechanics, scoring logic, and underlying science of our interactive learning modules: **AQI Mission** and **Hotspot Scout**.

---

## 📑 Table of Contents

* [Overview](#overview)
* [Game Rules and Scoring Logic](#game-rules-and-scoring-logic)
* [Pollution Science and AQI Calculation](#pollution-science-and-aqi-calculation)
* [Quiz Data Schema](#quiz-data-schema)
* [Content Contribution Guidelines](#content-contribution-guidelines)

---

## 🌍 Overview

The Pollution Control Hub features two primary gamified learning experiences:
1. **AQI Mission:** A trivia and scenario-based quiz game to test knowledge of air pollutants, health impacts, and mitigation strategies.
2. **Hotspot Scout:** An interactive geospatial mini-game where players analyze mock environmental data to pinpoint severe pollution sources on a map.

---

## 🎯 Game Rules and Scoring Logic

### AQI Mission Scoring
* **Base Points:** Players earn 100 points for every correctly answered question.
* **Time Bonus:** A speed multiplier is applied based on how quickly the user answers. (Remaining Seconds × 2).
* **Streak Bonus:** Answering 3 questions correctly in a row triggers a "Clean Air Streak," granting a flat 50-point bonus per subsequent correct answer.
* **Penalties:** Incorrect answers deduct 25 points to discourage random guessing.

### Hotspot Scout Scoring
* **Accuracy:** Players are awarded up to 500 points based on the geographical proximity of their dropped pin to the actual "hotspot" coordinates.
* **Data Analysis:** Identifying the correct primary pollutant (e.g., PM2.5 vs. NO2) at the hotspot awards an additional 200 points.
* **False Alarms:** Flagging a safe zone as a hotspot results in a 100-point deduction.

---

## 🧪 Pollution Science and AQI Calculation

Our games utilize real-world scientific formulas to simulate pollution data. The Air Quality Index (AQI) is calculated based on the United States Environmental Protection Agency (EPA) standards. 

When a player encounters raw pollutant concentration data in the game, the system calculates the AQI using the following linear interpolation formula:

$$I = \frac{I_{high} - I_{low}}{C_{high} - C_{low}}(C - C_{low}) + I_{low}$$

### Formula Variables
* $I$ = the Air Quality Index
* $C$ = the pollutant concentration
* $C_{low}$ = the concentration breakpoint that is $\le C$
* $C_{high}$ = the concentration breakpoint that is $\ge C$
* $I_{low}$ = the index breakpoint corresponding to $C_{low}$
* $I_{high}$ = the index breakpoint corresponding to $C_{high}$

Educators can use this exact formula to verify the accuracy of the scenarios presented in the game modules.

---

## 📊 Quiz Data Schema

To ensure compatibility with the `src/components/aqiGameData.js` file, all new questions and scenarios must follow a strict JSON schema. 

```json
{
  "id": "q_101",
  "category": "health_impacts",
  "difficulty": "medium",
  "questionText": "Which pollutant is most dangerous to individuals with asthma?",
  "options": [
    "Ozone (O3)",
    "Carbon Monoxide (CO)",
    "Particulate Matter (PM10)",
    "Sulfur Dioxide (SO2)"
  ],
  "correctAnswerIndex": 0,
  "explanationText": "Ground-level ozone heavily irritates the respiratory system, acting like a sunburn on the lungs."
}