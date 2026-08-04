# Shared Components

This document describes the reusable UI components, their public props, expected data structures, and intended usage throughout the application.

---


## LocationSearch

Autocomplete search component for selecting locations with recent-search history.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| onLocationSelected | function | Yes | — | Invoked with the selected location object. |
| initialCityName | string | No | `""` | Initial value displayed in the search input. |

### Selected Location Object

```ts
{
  id: string | number;
  name: string;
  displayName: string;
}
```

---
 
## Location Map

Interactive Leaflet map displaying pollution hotspots, optional wind overlays, and community reports.

### Pollution Point

```ts
{
  id: string | number;
  lat: number;
  lon: number;
  areaName: string;
  aqi: number;
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| center | `{ lat: number, lon: number }` | Yes | — | Coordinates used to center the map. |
| nearbyPoints | `Array<PollutionPoint>` | Yes | — | Pollution monitoring locations displayed as circle markers. |
| confidenceScore | `string` | Yes | — | Confidence level that affects hotspot visualization. |
| windData | `{ direction: number, speed: number } \| null` | No | `null` | Wind overlay information shown when available. |

---

## Calendar Heatmap

Displays historical AQI values in a GitHub-style calendar heatmap.

### DailyAQI

```ts
{
  date: string;     // YYYY-MM-DD
  maxAqi: number;
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| data | `Array<DailyAQI>` | Yes | Historical AQI records used to render the heatmap. |

--- 

## Skeleton

Reusable loading placeholder displayed while content is being fetched.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| className | `string` | No | `""` | Additional CSS classes applied to the skeleton element. |
| style | `React.CSSProperties` | No | `{}` | Inline styles used to customize the skeleton's appearance. |