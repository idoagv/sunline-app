# Apricity — Design Spec

**Date:** 2026-06-11
**Status:** Pivoted: sales-enablement positioning — pilot phase
**Working name:** Apricity (from the project formerly called "SunLine")

---

## 1. One-line product

**See the sunlight on any apartment — even one that hasn't been built yet.**

Apricity computes and visualises, per individual unit, how much direct sun an apartment gets across the day and seasons — accounting for the floor it sits on, its position on the floor plate, and the shadows cast by surrounding (and future) buildings.

**Positioning:** Apricity is a premium **B2B sales-enablement** tool — *the most persuasive way to show off a sunny apartment*. The simulation is honest; the **customer chooses which units to publish**. We sell persuasion built on real math, not a certified daylight study.

---

## 2. Why this is worth building (market rationale)

- **Sunlight has a quantified price.** Peer-reviewed studies: each extra daily hour of direct sun ≈ +2.4–3.2% apartment price; south-facing units carry a 5–15% premium over north-facing in the same building; in dense cities shadowed low units sell for up to ~20% less. This premium is the wedge — agents and developers have a concrete, dollar-denominated reason to *show off* a sunny unit.
- **Category validated by a major incumbent (2026-05-11).** Redfin launched **"Sunscore"** — a 0–100 *property-level* sunlight score on all US listings — in an exclusive partnership with **Shadowmap**. Strong proof that buyers care about sunlight enough to score every listing, and it starts a **competitive clock**. But Sunscore is *property-level, US-only, on-market resale* — it does **not** answer *per-unit*, does **not** do *off-plan*, and is **not** in *Israel*. That space is still unoccupied; the clock is now running.
- **Gap in the market — per-unit, not per-property.** Incumbents (Shadowmap / Redfin Sunscore, ShadeMap, SunCalc) answer building/terrain-level questions and leave the user to eyeball a facade. None cleanly answer **"which specific unit gets sun, when, for how long?"** — the exact place the dollar premium lives.
- **Hero use case — off-plan pre-sales.** Developers sell apartments years before completion with nothing concrete to show about light. Apricity drops a *future* building into its *real* surroundings and shows per-unit sun before construction. No incumbent does "imaginary building, real context, per-unit."
- **Pricing is a hypothesis, not validated.** Working assumption, to be tested in pilot calls (see [PILOT.md](../../PILOT.md)): **agents ≈ low hundreds per listing**, **developers ≈ low thousands per project** (off-plan). We deliberately do **not** anchor on the old €500–2,000 certified-daylight-study figure — that is a *different buyer* (compliance / planning-permission, certified studies) we are explicitly **not** serving.

## 3. Target customer & business model

- **Primary (cash register): real-estate agents (per-listing) + developer marketing teams (per-project, off-plan as the hero case).** They buy a persuasive per-unit sun visual to sell apartments faster and justify premiums. This is the **only paying segment**; monetise B2B.
- **Consumers are recipients, not a segment.** A buyer/renter receives a *share link* to a published Unit Page — an audience for the customer's pitch, not a paying user and not a traffic source we cultivate.
- **Operating principle — HONEST MATH, SELECTIVE PUBLICATION.** The engine never biases results; every unit is computed the same way. The **customer decides which units to publish**: a great-sun unit gets a beautiful page; a poor-sun unit simply isn't published. We are a sales-enablement tool used at the customer's discretion — and we **never** tune the math to flatter.
- **Public surface = published pages only.** There is **no** programmatic-SEO flywheel and **no** comprehensive comparison index. The only public artifacts are agent/developer-**published** per-unit pages (opt-in showcase). The earlier "one artifact serves both audiences / SEO shop-window" model is **retired** (see §10): selective publication and a trusted comparison surface are mutually exclusive — you cannot let the customer control what's shown *and* claim neutral coverage.
- **Listing portals are not customers.** Post Redfin × Shadowmap (2026-05-11), portals partner with incumbents or build in-house. At most a *future distribution channel* — not a buyer we sell to now.

## Positioning & claims policy

The pivot makes positioning a first-class design constraint, not a marketing afterthought:

- **Public pages are animation-first and qualitative.** The hero is a butter-smooth day/season animation plus plain-language readouts ("morning sun on the balcony", "bright through the afternoon"). We sell the *feeling* of sun.
- **Numbers OFF by default on public pages.** Precise sun-hours and the Sun Score are **off by default** on public Unit Pages; the customer may toggle them on per page. The public default avoids putting a contestable figure in front of a buyer.
- **Disclaimer on every public page:** *"Illustrative simulation, not a certified daylight study."* (Exact IL legal wording TBD — see §11.)
- **Full numbers internally.** The agent/developer's internal **Explorer** shows full sun-hours, per-floor strip, and Sun Score — used to *triage* which units are worth featuring. Numbers drive the customer's choice; qualitative visuals drive the buyer's emotion.
- **Never tune the engine to flatter.** Accuracy is **frozen at current quality** — neither degraded nor gold-plated. No further accuracy/golden-test investment until a customer asks (see §10). Honest math is the integrity floor that makes selective publication defensible rather than deceptive.

## 4. Name & hosting

- **Brand:** Apricity ("the warmth of the sun in winter"). Distinctive, memorable, on-theme.
- **Domain:** bare `apricity.com`/`.app`/`.xyz` are taken. Budget-friendly available options (verified via registry RDAP on 2026-06-10): `apricityhq.com`, `useapricity.com`, `tryapricity.com` (~$11/yr); `apricity.co` (~$25/yr), `apricity.io` (~$35/yr). **Recommendation:** a `.com` variant (~$11/yr). Exact domain to be finalised before launch; code uses `apricity` as a placeholder.
- **Caveat accepted:** bare `apricity.com` belongs to another party; minor brand-dilution risk.
- **App hosting:** Vercel (already configured). Free Hobby tier to start; Pro ($20/mo) only when needed.
- **Data/auth (when needed):** Supabase free tier (Postgres + auth + storage). Start with JSON; add at first paying developer.
- **Domain registrar:** Porkbun or Cloudflare (cheap, free WHOIS privacy).
- **Launch cost:** ~$0 + ~$10/yr domain. Scales to ~$20–45/mo with customers.

## 5. Architecture

**Keep Next.js (App Router) on Vercel. Add TypeScript. Separate the engine from the UI.**

Rationale for keeping Next.js: it serves the public pages and the dashboard from one codebase — SSR for public Unit Pages (shareable, branded), an authenticated dashboard, and API routes for map-data ingestion and exports. A SPA + separate API buys nothing here and discards the migration already done.

### Modules (framework-agnostic core)

| Module | Responsibility | Isolation rationale |
|---|---|---|
| `solar` (TS, pure) | Sun position (azimuth/elevation, sunrise/sunset) + **2.5D per-facade and self-shadowing** + sun-hours integration + Sun Score. Evolves the existing `src/utils/solarMath.js`. | Unit-tested against reference data. Correctness is the product's credibility. No DOM, no React. |
| `scene` (TS, pure) | The data model (see §6): project → buildings (each `source: auto \| manual \| authored`) → subject building → floors → unit grid → derived facades. Validation + JSON serialization. | One model serves all three onboarding paths and both 2D abstraction + future real-footprint mapping. |
| `ingest` (TS) | Fetch building footprints + heights from OpenStreetMap (Overpass API); normalise into `scene` context buildings. | Swappable data source; failures degrade gracefully to manual fill. |
| UI (React + Tailwind) | SVG views (floor-plate grid, top-down site, per-floor strip), MapLibre GL for authoring/context. | Skin over the engine. A 3D view can be added later without touching the math. |

### Deliberate foundation choices

1. **TypeScript** for `solar` and `scene` (incremental — Next runs JS+TS together).
2. **Vitest golden tests** on `solar`: assert sun-hours/positions match a known reference (SunCalc/NOAA) for known dates/locations.
3. **MapLibre GL + OSM/Overpass** for map + building data (free, no API keys).
4. **Rendering = SVG** for diagrammatic views (lightweight, crisp, already in use). No WebGL/3D in v1.

### Deferred on purpose (YAGNI for now)

Real auth + multi-tenant DB (start with versioned JSON), 3D rendering, terrain, trees, reflections. Nothing in the data model blocks adding these later.

## 6. Data model (`scene`)

```
Project
  id, name, location { lat, lon, label }, branding { logo, contact, listingUrl }
  displayUnits: 'metric' | 'imperial'   // default 'metric'; viewer can override
  buildings: Building[]
  subjectBuildingId            // the one being sold/analysed

Building
  id, source: 'auto' | 'manual' | 'authored'
  footprint: Polygon           // ground outline (lng/lat or local meters)
  baseElevation: number        // ground height (m), default 0
  height: number               // total height (m); or floors * floorHeight
  // subject buildings only:
  floors?: number
  floorHeight?: number         // m per floor
  unitGrid?: { rows, cols }    // configurable matrix (2x2 ... 10x10)
  unitLabels?: Record<cellKey, string>   // e.g. "1-1" -> "5S"

Unit (derived, not stored)
  floor, row, col
  facades: ('N'|'E'|'S'|'W')[]  // derived from grid position: corner=2, edge=1, interior=0
  position: 'corner' | 'edge' | 'interior'

SavedUnit (per salesperson/project)
  label, floor, row, col
```

Notes:
- v1 unit model = **configurable rectangular grid** over the floor; facades derived from cell position.
- Interior cells (no exterior wall) get zero direct sun ("core").
- Later layer: map the grid onto the **real articulated footprint** so labels sit where units truly are, and support **self-shadowing** between wings of the same building.

## 7. Solar engine (`solar`)

- **Sun position:** declination, azimuth, elevation, sunrise/sunset for a given lat/lon, date/season. Location-independent (no hardcoded latitude).
- **Per-unit sun (2.5D):** for each exterior facade of a unit, sample point(s) at the unit's real height (floor × floorHeight + base). A facade is lit at time *t* when:
  1. sun elevation > 0, and
  2. the sun is in front of the facade (azimuth within the facade's hemisphere), and
  3. the sun ray is **not blocked** by any context building (extruded footprint), and
  4. the sun ray is **not blocked by the subject building's own mass** (self-shadowing).
- **Sun-hours:** integrate lit time across the day (fine time step). Split morning/afternoon.
- **Sun Score (0–100):** normalised headline metric for marketing (e.g. lit hours ÷ achievable daylight). Simple, shareable. Kept as a core concept.
- **Seasons:** at minimum winter solstice / equinox / summer solstice; ideally any date.
- **Units:** the engine computes internally in SI (meters; all footprint/height geometry in meters). Lengths are converted for display to **metric (m)** or **American/imperial (ft)** per `Project.displayUnits`, with an optional viewer-side override (toggle on the Unit Page). Sun-hours are time (hours) and unit-system-independent. Conversion lives in the UI layer, never in the engine.

**Testing:** golden tests vs SunCalc/NOAA for several lat/lon + dates (position + sunrise/sunset). Geometry unit tests for ray/extrusion occlusion. Parity test: the 3 existing towers produce results consistent with the current working app.

## 8. Product surfaces

The old single "Sun-Page" splits into two surfaces with opposite jobs: a public **Unit Page** (persuade the buyer) and an internal **Explorer** (help the customer choose what to publish).

### ① Unit Page — public, *the product* — Phase 1 (built)

One unit, one **shareable, branded URL**. Mobile-first. This is the deliverable the agent sends a prospect.
- **Butter-smooth day/season animation** as the hero — play/scrub time-of-day, season toggle; the unit lights up / goes dark live.
- **Qualitative readout** ("morning sun on the balcony", "in sun now"). Precise sun-hours + Sun Score **off by default**, customer-toggleable (see *Positioning & claims policy*).
- **Disclaimer:** "Illustrative simulation, not a certified daylight study."
- **Customer branding** (agent/developer logo, contact, listing link).
- This is what **"Saved units" becomes**: the agent triages in the Explorer, selects the units worth showing, and **publishes** each as a Unit Page. **This publish workflow is now the core of the product**, not a side feature.

### ② Explorer — internal triage tool — Phase 1 (built)

The existing full floor-plate grid: configurable unit picker, per-unit numbers, per-floor "sun strip", season/floor controls. Used by the agent/developer **in the sales office** to understand a building and **decide which units to publish**.
- Shows **full numbers** (sun-hours morning/afternoon, Sun Score) for triage.
- **Not indexed, not public, not the deliverable** — an internal decision tool.

### ③ Light authoring (Studio) — Phase 2 (gated on pilot signal)

A fast "make me a page" flow: map ingest (OSM/Overpass) + manual fill + subject-building definition + unit-grid setup, **optimised for minutes-to-page**, with **off-plan authoring** included. Built **only after** the pilot produces a yes (see §9). Until then, scenes are authored **manually as JSON**.

### ④ Dashboard (B2B SaaS) — Phase 3

Auth, multi-project management, branding, view analytics, **PDF/widget export**, paid plans (Supabase).

## 9. Build phasing

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Foundations** ✓ | TS `solar` engine (position + per-facade + self-shadowing + sun-hours + score), `scene` model, golden tests, 3 towers refactored onto it. | A correct, tested core. |
| **1 — Unit Page + Explorer** ✓ | Public **Unit Page** (animation-first, qualitative, branded) + internal **Explorer** (full numbers, per-floor strip). Mobile-first. | The two product surfaces exist. |
| **1.6 — PILOT (now)** | One **real, currently-listed, genuinely sunny** building. Scene authored **manually as JSON** (footprint traced by hand, floors, floor height, immediate-neighbour heights) — **no Studio UI**. Publish **2–3 branded Unit Pages**. This is the **demo asset for cold outreach**: **10 agents + 2–3 developer-marketing leads**. **Success bar:** someone puts a page on a real listing, asks for another, or names a budget. **Kill criterion:** 10 pitches, zero engagement → stop. See [PILOT.md](../../PILOT.md). |
| **2 — Light authoring** *(only after a yes)* | Fast "make me a page" flow: map ingest (OSM/Overpass) + manual fill + unit-grid setup, optimised for **minutes-to-page**; **off-plan authoring** included. The old "Phase 2 Studio" scope is **gated on pilot signal**. |
| **3 — Dashboard + money** | Auth, multi-project dashboard, branding, analytics, exports, paid plans. *(unchanged)* |

**This spec now drives Phase 1.6 (pilot).** Phases 2–3 are roadmap, explicitly gated on pilot signal.

## 10. Decisions log

**2026-06-10 (original):**
- Buyer: developers/agents first, consumers as shop window. *(superseded 2026-06-11 — consumers are recipients of share links, not a segment.)*
- Onboarding: layered (auto → manual → authored), unified `scene` model.
- Fidelity: 2.5D per-floor, visualised simply (SVG). No 3D in v1.
- Deliverable: shareable project Sun-Page + (later) dashboard. *(superseded 2026-06-11 — public Unit Page + internal Explorer.)*
- Unit model: configurable grid (position-based), not direction-only. Self-shadowing required. Real-footprint mapping is a later layer.
- Framework: keep Next.js + Vercel; add TypeScript; engine/UI separation.
- Name: Apricity (placeholder; may be reconsidered — code references `apricity` so a rename is a find-replace). Domain = a `.com` variant (~$11/yr), finalise pre-launch.
- Units: engine in SI internally; UI converts to metric (m) or American (ft) per `Project.displayUnits` with viewer override.

**2026-06-11 (pivot — sales-enablement positioning):**
- **Repositioned** from "honest, decision-grade per-unit sun data" to **premium B2B sales-enablement** — *the most persuasive way to show off a sunny apartment*.
- **Buyers:** real-estate agents (per-listing) + developer marketing (per-project, off-plan hero case). **Consumers are recipients of share links, not a paying segment and not an SEO flywheel.**
- **Operating principle:** HONEST MATH, SELECTIVE PUBLICATION — the engine never biases; the customer chooses which units to publish.
- **Public pages:** animation-first + qualitative; precise **sun-hours and Sun Score off by default** (customer-toggleable); every public page carries an *"illustrative simulation, not a certified daylight study"* disclaimer.
- **Surfaces split:** public **Unit Page** (the product) + internal **Explorer** (triage). The "Saved units → publish Unit Page" workflow becomes the core.
- **Portals removed as customers** (Redfin × Shadowmap, 2026-05-11) — future distribution channel at most.
- **SEO flywheel retired:** no programmatic comparison surface; public = published pages only.
- **WTP anchor dropped:** removed the €500–2,000 certified-study figure (different buyer); pricing is an unvalidated hypothesis to test in the pilot.
- **Sun Score formula work parked.**
- **No further accuracy / golden-test investment** until a customer asks (accuracy frozen at current quality, not removed).
- **Next phase = 1.6 Pilot:** one real listed building, manual JSON scene, 2–3 Unit Pages, cold outreach; Studio (Phase 2) gated on pilot signal.

## 11. Open questions (non-blocking)

- **Pricing + budget-line validation** via pilot calls — agents (low hundreds per listing?) and developers (low thousands per project?), and *which* budget line it comes from. See [PILOT.md](../../PILOT.md).
- **Disclaimer legal wording (IL)** — the precise "illustrative simulation, not a certified daylight study" text that is safe under Israeli consumer/advertising law.
- Exact domain choice (`apricityhq.com` vs `useapricity.com` vs `tryapricity.com` vs `.co`).
- How literally the v1 grid should approximate the real articulated footprints before Phase-2 real-footprint mapping.
- Units of footprint geometry (lng/lat vs local meters) — to be fixed in Phase 0 model.
