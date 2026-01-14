# Quick Data Visualization Tool (Mobile-First) — Product + Technical Specification

**Document status:** Draft v1  
**Primary constraint:** Must run as a static web app on GitHub Pages (no mandatory backend) and access public data sources without recurring login or API-key management for core functionality.  
**Preferred visualization library:** **D3.js**

---

## 1. Intent and product vision

You want a **fast, mobile-first “ask → chart” tool** for when you are on the go (smartphone-first). The tool should let you **create your own visualizations from authoritative public datasets**—economics, energy, EV adoption and charging infrastructure, and health indicators—by quickly selecting or specifying:

- the **dataset / indicator(s)** (e.g., GDP per capita, electricity demand, life expectancy),
- the **entities** (country/region),
- the **time range** (years/months),
- and the **chart type** (line, bar, scatter, etc.),

and then immediately rendering a chart backed by **actual fetched data**, with clear **provenance** (source + query + timestamp).

A key goal is **low friction**: the app should prefer data sources that are **publicly accessible without interactive authentication** and can be called directly from a browser. This enables a “pull real data now” experience without managing API keys while traveling. Hosting on **GitHub Pages** avoids dedicated infrastructure and keeps deployment lightweight and repeatable via a GitHub repository.

---

## 2. Goals, non-goals, and success metrics

### 2.1 Goals
1. **Mobile-first usability:** minimal steps from opening app to seeing a chart.
2. **No recurring login:** core sources must work without accounts or API keys.
3. **Data provenance:** every chart shows source name, dataset/indicator identifiers, query URL, fetch timestamp, and attribution/license note.
4. **Reproducible sharing:** shareable URLs reconstruct the exact chart state.
5. **Static deployment:** runnable from GitHub Pages (SPA + PWA).
6. **Dataset discoverability:** a first-class overview page that helps you browse datasets/indicators available for analysis.

### 2.2 Non-goals (initial release)
- User accounts / server-side profiles.
- Complex data warehousing or scheduled ETL.
- Guaranteed support for any API that lacks CORS (handled later via optional proxy mode).
- High-frequency real-time dashboards.

### 2.3 Success metrics
- Time-to-first-chart on mobile: < 30 seconds for a new user.
- ≥ 3 “Tier A” sources usable without authentication.
- ≥ 90% of charts include complete provenance and exportable data.
- Dataset overview page enables indicator discovery within 3 taps from home.

---

## 3. Personas and usage scenarios

### 3.1 Primary persona
- Knowledge worker / analyst / technically curious user who wants quick, credible visuals on a phone.

### 3.2 Example scenarios
- “Plot electricity demand over time for Germany and France.”
- “Show EV charging points (OSM) around Hamburg (or within a bounding box).”
- “Scatter: GDP per capita vs life expectancy for EU countries, latest year.”
- “Top 10 countries by renewable electricity share in 2022.”

---

## 4. MVP scope

### 4.1 MVP user flow (mobile)
1. Open app (PWA-capable).
2. Choose:
   - Data source (or “Auto” from curated list)
   - Dataset/indicator (search + browse + favorites)
   - Entities (countries/regions)
   - Time range
   - Chart type
3. Render chart + provenance card.
4. Export CSV/PNG and share a URL.

### 4.2 MVP chart types (D3.js)
- **Line** (time series)
- **Bar** (ranking / category comparison)
- **Scatter** (cross-sectional comparison X vs Y)

### 4.3 MVP data sources (recommended initial “Tier A”)
- World Bank Indicators API
- Eurostat API
- Our World in Data (direct CSV/JSON URLs)
- OECD (SDMX) — if feasible in browser; otherwise add later
- UN SDG API — if feasible in browser; otherwise add later
- Ember electricity datasets / API
- OpenStreetMap Overpass API (EV charging stations, infrastructure)

**Note:** Source inclusion is constrained by CORS support and payload formats. Sources that do not reliably allow browser cross-origin fetch may require the optional “proxy mode” (see §11).

---

## 5. System architecture

### 5.1 High-level architecture
- **Frontend:** Single Page Application (SPA), mobile-first UI.
- **Hosting:** GitHub Pages (static hosting).
- **Visualization:** **D3.js** for rendering charts, interactions, and export.
- **Data access:** Browser `fetch()` calls to public APIs (CORS-dependent).
- **State:** Encoded in URL (querystring or hash) for shareable reproducibility.
- **Caching:** in-memory + optional persistent cache (IndexedDB/localStorage).
- **PWA:** service worker caches app shell and optionally recent query results.

### 5.2 Key constraint: CORS
- Prefer sources that support browser-based access (CORS enabled).
- For sources without CORS: either do not include in MVP or route through optional proxy (see §11).

---

## 6. Dataset overview page (required)

The application shall provide a **Dataset Overview** page that gives you a clear, navigable overview of what data is available for analysis.

### 6.1 Overview page objectives
- Provide a **catalog** of all configured data sources and their datasets/indicator namespaces.
- Support **search** (free-text) across:
  - source name
  - dataset name
  - indicator code
  - indicator title
  - tags/topics (e.g., economy, energy, EV, health)
- Support **filtering** by:
  - topic/tags
  - geography scope (global/EU/etc., if known)
  - time coverage (if known)
  - format type (JSON/CSV/SDMX/JSON-stat)
- Provide **preview affordances**:
  - “Quick Plot” to open chart builder with the selected indicator prefilled
  - “View metadata” showing unit, description, last updated (if provided by source), and example query

### 6.2 Catalog data model (internal)
A normalized catalog entry should be created for display regardless of source format:

```json
{
  "sourceId": "worldbank",
  "sourceName": "World Bank Indicators",
  "datasetId": "indicators",
  "indicatorId": "NY.GDP.PCAP.CD",
  "title": "GDP per capita (current US$)",
  "description": "…",
  "unit": "current US$",
  "topics": ["economy", "macroeconomics"],
  "geography": "country",
  "timeCoverage": { "start": "1960", "end": "2024" },
  "exampleQuery": {
    "queryType": "time_series",
    "entities": ["DEU"],
    "timeRange": { "start": "2000", "end": "2024" }
  }
}
```

### 6.3 Implementation notes
- Start with a **curated starter catalog** (hand-authored list) to ensure usability on day one.
- Incrementally add **live catalog fetching** where sources provide indicator listing endpoints.
- Cache catalog responses locally with TTL.

---

## 7. Data source registry (core specification)

The tool shall maintain a **Data Source Registry**: a JSON (or TS) configuration that describes each source, endpoints, formats, and parsing rules.

### 7.1 Source definition schema

```json
{
  "id": "worldbank",
  "displayName": "World Bank Indicators",
  "homepage": "https://data.worldbank.org/",
  "baseUrl": "https://api.worldbank.org/v2",
  "auth": { "mode": "none" },
  "corsExpected": true,
  "rateLimitNotes": "Unspecified; handle with caching and retries.",
  "formats": ["json"],
  "endpoints": {
    "indicatorSearch": {
      "pathTemplate": "/indicator",
      "method": "GET",
      "params": {
        "format": { "fixed": "json" },
        "per_page": { "default": 50 },
        "page": { "default": 1 }
      }
    },
    "indicatorData": {
      "pathTemplate": "/country/{country}/indicator/{indicator}",
      "method": "GET",
      "params": {
        "format": { "fixed": "json" },
        "date": { "example": "2000:2024" },
        "per_page": { "default": 20000 }
      }
    }
  },
  "parsing": {
    "type": "worldbank-json-v2"
  },
  "attribution": {
    "text": "Source: World Bank",
    "license": "As provided by World Bank datasets; display link to dataset."
  }
}
```

### 7.2 Registry requirements
- Must support **multiple formats**: `json`, `csv`, `jsonstat`, `sdmx`.
- Must support **indicator discovery** (search/browse) where available.
- Must support **query templates** for standardized chart generation (§8).
- Must include **attribution and provenance** templates (§10).
- Must include optional `transformers` for normalization to internal canonical data structures.

---

## 8. Query model and templates

### 8.1 Canonical query object (internal)

```json
{
  "version": 1,
  "sourceId": "worldbank",
  "queryType": "time_series",
  "title": "GDP per capita — Germany",
  "entities": ["DEU"],
  "x": { "field": "time" },
  "y": [{ "indicatorId": "NY.GDP.PCAP.CD", "label": "GDP per capita (current US$)" }],
  "filters": {
    "timeRange": { "start": "2000", "end": "2024" }
  },
  "render": {
    "chartType": "line",
    "stack": false,
    "logScaleY": false
  }
}
```

### 8.2 Supported query types (MVP)
1. `time_series`
2. `cross_section` (single indicator across many entities at one time)
3. `scatter` (indicator X vs indicator Y across entities at one time)
4. `ranking` (top N by indicator)

### 8.3 Query templates (standard)
- **Time series template**
  - Inputs: `sourceId`, `indicatorId`, `entities[]`, `timeRange`, `frequency`
  - Output: aligned time series dataset

- **Cross section template**
  - Inputs: `indicatorId`, `entities[]`, `year`
  - Output: entity → value map

- **Scatter template**
  - Inputs: `indicatorIdX`, `indicatorIdY`, `entities[]`, `year`
  - Output: (x,y) per entity, with labels

- **Ranking template**
  - Inputs: `indicatorId`, `year`, `regionFilter`, `topN`
  - Output: sorted list of entities by value

---

## 9. Data normalization (internal data contract)

All source responses must be normalized into one of these canonical structures:

### 9.1 TimeSeriesDataset

```json
{
  "kind": "TimeSeriesDataset",
  "series": [
    {
      "entityId": "DEU",
      "entityLabel": "Germany",
      "indicatorId": "NY.GDP.PCAP.CD",
      "indicatorLabel": "GDP per capita (current US$)",
      "points": [
        { "t": "2000", "v": 23456.7 },
        { "t": "2001", "v": 24012.3 }
      ],
      "unit": "current US$"
    }
  ],
  "provenance": { "sourceId": "worldbank", "retrievedAt": "2026-01-13T10:00:00Z" }
}
```

### 9.2 CrossSectionDataset

```json
{
  "kind": "CrossSectionDataset",
  "indicatorId": "SP.DYN.LE00.IN",
  "indicatorLabel": "Life expectancy at birth, total (years)",
  "time": "2022",
  "rows": [
    { "entityId": "DEU", "entityLabel": "Germany", "value": 81.1 },
    { "entityId": "FRA", "entityLabel": "France", "value": 82.4 }
  ],
  "unit": "years",
  "provenance": { "sourceId": "worldbank", "retrievedAt": "2026-01-13T10:00:00Z" }
}
```

### 9.3 ScatterDataset

```json
{
  "kind": "ScatterDataset",
  "time": "2022",
  "x": { "indicatorId": "NY.GDP.PCAP.CD", "label": "GDP per capita", "unit": "US$" },
  "y": { "indicatorId": "SP.DYN.LE00.IN", "label": "Life expectancy", "unit": "years" },
  "points": [
    { "entityId": "DEU", "entityLabel": "Germany", "x": 48700, "y": 81.1 },
    { "entityId": "FRA", "entityLabel": "France", "x": 44700, "y": 82.4 }
  ],
  "provenance": { "sourceId": "worldbank", "retrievedAt": "2026-01-13T10:00:00Z" }
}
```

---

## 10. Provenance, attribution, and reproducibility

### 10.1 Provenance requirements (must display per chart)
- Source display name
- Dataset/indicator IDs (as applicable)
- Fully-resolved query URL(s) (or a “details” expander)
- Retrieval timestamp (local and ISO)
- Attribution/license text (from registry)

### 10.2 Shareable URL state
All chart state must be encodable in a URL:
- Preferred: `/#/chart?<base64url-encoded-json>`
- Requirements:
  - deterministic (same state yields same URL)
  - versioned (e.g., `v=1`)
  - small enough for common mobile sharing workflows

---

## 11. Optional “Proxy Mode” (future enhancement)

Because GitHub Pages is static, APIs that do not support CORS cannot be fetched directly from the browser. To expand source coverage, define a future optional mode:

- **Proxy service:** Cloudflare Worker / similar edge function
- **Purpose:** Forward requests, add CORS headers, optionally cache
- **Constraints:** Must not require user login; must not store personal data
- **Config:** App uses a `PROXY_BASE_URL` environment/build variable

MVP may omit proxy mode; the architecture must not preclude adding it.

---

## 12. UI/UX specification (mobile-first)

### 12.1 Core screens
1. **Home / Chart Builder**
   - Source selector (Auto + explicit)
   - Indicator search + browse entrypoint to **Dataset Overview**
   - Entity selector (countries/regions)
   - Time range picker
   - Chart type selector (line/bar/scatter)
   - “Plot” action
2. **Chart View**
   - D3.js chart area
   - Quick-edit controls (change entity, year, chart type)
   - Provenance card (expandable)
   - Export buttons (CSV, PNG)
   - Share link action
3. **Dataset Overview**
   - Source cards + dataset/indicator lists
   - Search, filters, tags, metadata preview
4. **Saved / Recent**
   - Recently viewed charts (local storage)
   - Favorites (indicators and entity sets)

### 12.2 Interaction requirements
- Tap-tooltips for values
- Pinch-zoom/pan where practical (optional, depending on complexity)
- Responsive axes labels and font sizes
- Accessible defaults; avoid hard-coded color palettes initially

---

## 13. Caching, performance, and reliability

### 13.1 Caching policy
- **Session cache:** in-memory Map keyed by resolved request URL
- **Persistent cache (optional):** IndexedDB/localStorage with TTL (e.g., 24h)
- **Cache invalidation:** TTL-based + manual “refresh” action on chart

### 13.2 Reliability
- Exponential backoff retries for transient failures (max 2 retries)
- Friendly error messages:
  - CORS blocked
  - rate limited (HTTP 429)
  - unavailable source

---

## 14. Export requirements

### 14.1 CSV export
- Export the normalized dataset used in the chart
- Include header metadata rows:
  - source, indicator IDs, retrieval timestamp, query URL(s)

### 14.2 PNG export
- Export chart as image (client-side render capture)
- Include a small caption area (optional) with source attribution

---

## 15. Technology recommendations (implementation-leaning)

### 15.1 Frontend stack (suggested)
- TypeScript + React (or comparable SPA framework)
- **D3.js** for visualization and interaction
- Service worker for PWA shell caching
- Build + deploy to GitHub Pages via GitHub Actions

### 15.2 Parsing libraries (as needed)
- CSV parser (for OWID and similar)
- JSON-stat parser (Eurostat often uses JSON-stat structures)
- SDMX parsing (OECD/UN SDG may require; add in phases)

---

## 16. Milestones and deliverables

### Milestone 1 — App scaffold
- SPA + mobile layout
- GitHub Pages deployment
- PWA manifest + service worker for shell

### Milestone 2 — Data source registry + 3 sources end-to-end
- Registry implemented
- World Bank + OWID + Eurostat integrated
- Line, bar, scatter charts working in D3.js
- Provenance displayed

### Milestone 3 — Add energy + EV infrastructure sources
- Ember integrated
- Overpass integrated (EV charging points)
- Add bounding box selection for Overpass queries (basic)

### Milestone 4 — Sharing + export + persistence
- URL state reconstruction
- CSV + PNG export
- Recent charts + favorites
- Dataset overview page matured with search + filters + caching

---

## 17. MVP acceptance criteria

The MVP is accepted when:
1. On a smartphone, a user can generate line/bar/scatter charts from at least **three** sources without authentication.
2. Each chart displays complete provenance and attribution.
3. The same chart can be reconstructed using a shared URL.
4. Data can be exported as CSV and chart as PNG.
5. The app is deployable and usable from GitHub Pages.
6. A Dataset Overview page enables discovery and quick plotting of indicators.

---

## 18. Appendix: Initial curated indicator pack (examples)

**Economics (World Bank / OECD / Eurostat):**
- GDP per capita
- CPI / inflation
- Unemployment rate

**Energy (Ember / Eurostat / OWID):**
- Electricity demand
- Renewable share of electricity
- CO₂ intensity of power

**Health (OWID / World Bank / UN SDG):**
- Life expectancy
- Infant mortality
- Selected SDG health indicators

**EV / Charging infrastructure (Overpass / optional external sources later):**
- Count of charging stations by bounding box / country (OSM tags)
- Density estimates (stations per km² or per population, if population is available via another source)
