# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial setup of the Changelog document.
- Replaced notification checkbox with pill-style ON/OFF toggle matching the theme switch design (#459)

### Fixed
- Auto-refresh and "Refresh Now" now actually fetch new readings. `airQualityService`
  read its own cache with no TTL, so every refresh replayed the first response of the
  session for up to 24 hours (#495)
- `subAqi`/`estimateAQI` no longer report 0 ("Good") for concentrations that fall in the
  gaps between EPA breakpoint bands, e.g. PM2.5 between 12.0 and 12.1 µg/m³ (#496)
- Community report text is no longer double-escaped — titles and descriptions were being
  HTML-escaped before storage and escaped again on render, so readers saw `&amp;` and
  `&#x27;`. Reports already saved in the escaped form are repaired on load (#497)
- The app now follows the OS colour scheme for users who have never picked a theme. The
  "no manual preference" check was unreachable because the theme was written to
  localStorage on mount (#498)
- `fetchCityComparisons` no longer substitutes a fabricated AQI of 85 when a city's
  request fails; unavailable cities are reported as such instead of being ranked against
  real measurements (#499)
- Added handling for denied notification permission state, which previously showed no UI