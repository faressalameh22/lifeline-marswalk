# CLAUDE.md: LIFELINE handoff

Read this first. It carries every decision made so far, so you do not need to re-ask the team. Last updated 15 Nov 2026, 07:20 Nablus time, after commit d1f5077.

## Status in one paragraph

The product, the data work, the slides and the submission text are finished and live. All tests pass. What is left is for the team: submit on the Space Apps site (first full submission by 16:00, final before 23:59) and rehearse the presentation, which **now includes a discussion with the judges**. Feature freeze was Sunday noon; only fix real bugs after that, and run every test before each commit.

## Who and when

- Team **Six Seven** (5 people, 3 laptops, 1 iPad), NASA Space Apps Challenge 2026, **Nablus local event** (An-Najah University). All team members are 18 or older.
- **Talk to the team in Arabic.** Everything the judges see (site, README, slides, submission page) is in **English**.
- Never put team members' names, emails, phone numbers or other personal details in any file. Under-18s' names, voices or likenesses must never appear (Space Apps rules).
- Challenge: **Interplanetary Survival Guide: Martian Map** (layered map from several missions to plan a safe Marswalk with new science).
- Target award: **Best Mission Concept** (2025 winner PureFlow tested habitats against solar storms, "crew safety first": the closest match to our pitch).
- **Deadline: Sunday 15 Nov 2026, 23:59 Nablus time (UTC+2).**
- Judges read the slides, open the demo and **hold a discussion**. Speaker notes and Q&A prep are in `slides/`.

## Links (all public, no login)

- Site: https://faressalameh22.github.io/lifeline-marswalk/ (GitHub Pages from `main`, root)
- Repo: https://github.com/faressalameh22/lifeline-marswalk
- Submission slides (sent to Space Apps, read without a presenter): https://faressalameh22.github.io/lifeline-marswalk/slides/LIFELINE-submission.pdf
- **Live presentation plan (changed 15 Nov):** a 1-minute intro deck (7 slides, ~8 s each) then the team's own 2-minute video. Intro deck: https://faressalameh22.github.io/lifeline-marswalk/slides/LIFELINE-intro.pdf (script: `slides/intro-notes.md`; Arabic-only version `slides/intro-notes-ar.md`).
- Detailed presentation slides (backup for the judges' questions): https://faressalameh22.github.io/lifeline-marswalk/slides/LIFELINE-slides.pdf
- Submission text to paste: `SUBMISSION.md` (includes a References section: documents, data sources, tools and open-source software)

## Rules that can disqualify us

- Demo: **≤ 7 slides including the title** (chosen) or a ≤ 30 s video.
- All submission text and linked material in English; every link public.
- NASA data must be used (it is). Partner data is a plus (ESA HRSC terrain).
- AI use disclosed (README, SUBMISSION, slide 7). No AI-generated images in the project. No NASA logos; no "NASA" in names or logos; "not endorsed by NASA" is stated.
- Content rules: no offensive or discriminatory language, no commercial promotion, no proprietary material, only material we may use (NASA public domain, HiRISE with credit, HRSC CC BY 4.0, three.js MIT, Google Fonts OFL), no personal information.
- All team members registered to the Nablus event.

Judging criteria (1 to 5 each): Impact, Creativity, Validity, Relevance, Presentation.

## The product

LIFELINE applies the Apollo rule "never go farther than you can walk home" to Mars as a live, minute-by-minute check on real terrain. Three limits:
1. **Walk-back** if the rover fails: suit reserve vs walking time home over real terrain, plus a 20% pad.
2. **Ride-back** if a suit fails: 57 min (0.95 h) emergency oxygen vs the padded ride home at 10 km/h.
3. **Time and daylight**: home within a 6 h EVA, after sunrise and before sunset (REMS).

Visit order is **always A → B → C** (team decision, 15 Nov; replaced Apollo's farthest-first). Gates at each stop: if the margin ahead < 30 min or the plan would overrun the time limit, drop the lowest-science remaining stop (plan B), else go home (plan C). The safety pad is never offered as a fix.

Site features: Plan / Walk / 3D views; margin field (green safe, yellow tight, red no return); ride-back limit; time slider; crises rover / suit / injured / storm (combinable, "what if" buttons); Running late; plan ladder A–D; decision gates; Why GO / NO-GO with fixes; backup card (leave-by times); draggable stops (2D only, nearest stop picked); science value per stop; Environment panel (RAD dose rate and dose for this walk, REMS daylight, temperature, pressure, sky); Validation panel (10 checks + sensitivity chart); Model and assumptions panel (15 inputs, clamped to min/max) with a sourced reference list; on-screen error bar if any script fails.

3D view (`js/view3d.js`, three.js 0.160.0 via an import map to jsDelivr, loaded on first press): real HRSC shape, height slider ×1–×6, solid block walls; surface **Realistic Mars** (procedural colours from height and slope, procedural normal/roughness detail, low 25° sun with shadows, dusty sky, light fog; labelled "not a photo") or **Safety Overlay** (the live 2D map); **safety fence** (translucent wall at the walk-back limit, marching squares on the walk-home field, shrinks with time; a status line explains it); route tubes (blue ahead, grey done), pins H/A/B/C, crew ball, crisis path; steep slopes (amber > 15°, red above the slope limit); elevation profile with climb/descent; views Overview / Crew view / Top; pinch zooms toward the fingers (min 1 km), camera kept ≥ 40 m above ground. Stops are dragged on the 2D map only (decided: precision, no rotate/drag conflict).

Out of scope, do not add: helmet HUD, satellite imagery basemap, wind, fatigue model, crew size, multiple pages, backend, accounts. Declined on purpose: more crisis types (no sourced numbers), more hand-placed shelters (would not help double failures and would be invented), dragging in 3D.

## The mission

| Point | Lat | Lon | Source |
|---|---|---|---|
| Habitat | −4.73384 | 137.40960 | Curiosity waypoint, sol 3038 (flat) |
| A Altadena | −4.79985 | 137.38354 | Where Curiosity stood for the sol 4564 drill (site 116, drive 1944) |
| B Monte Grande | −4.80784 | 137.38104 | Sol 4687 waypoint (site 119, drive 1722), where the B image was taken |
| C new hollow | −4.80640 | 137.38150 | Inside the boxwork, never reached: 90 m from the rover path up to sol 4687, 57 m since sols 4810–4813 |

## Code and files

```
index.html               markup, CSS, import map, error bar
js/mission.js            habitat, stops, DEFAULTS (single source of default values)
js/model.js              terrain, Dijkstra, plans, gates, crises, daylight, validation (no DOM)
js/app.js                UI inside an IIFE (older iOS Safari mis-scoped block functions: keep the IIFE)
js/view3d.js             3D view (ES module)
data/terrain.js          HRSC 30 m slice, 159 x 221 cells
data/rover-track.js      885 Curiosity waypoints
data/rems-weather.js     REMS rows incl. sunrise/sunset, sols 4564-4687
data/img/                stop images (A Mastcam, B Front Hazcam, C HiRISE crop)
data/refs/               copy of the Apollo 15 memo NASA-CR-111182 (the NASA URL now redirects)
docs/verification/       raw-data verification report and HiRISE overlays for stop C
docs/user-test/          5-minute user-test protocol (not run yet; no results may be claimed)
docs/site-guide-ar.md    Arabic walkthrough of every part of the site
docs/video-handoff.md    brief for making the project video (facts, assets, credits, script, rules)
slides/                  submission.html -> LIFELINE-submission.pdf (7 self-explaining slides for the submission),
                         intro.html -> LIFELINE-intro.pdf (1-minute intro before the video, notes in intro-notes.md),
                         index.html -> LIFELINE-slides.pdf (detailed deck, backup for questions), shots/, shots.mjs, render.mjs, cdp.mjs,
                         speaker-notes(.md / -ar.md), qa-prep(.md / -ar.md)
SUBMISSION.md            submission page text
tests/                   see below
```

No build step. Plain scripts with `var` globals so Node can load them with `vm`.

## Tests (run before every commit)

Node is installed at `~/.local/node/bin/node` (Homebrew could not build it). Google Chrome is used headless with software WebGL.

- `node tests/run-tests.js`: must print **10 of 10 checks passed** and "Extra: adding a crisis never raises the margin: holds".
- `node tests/audit-numbers.js`: recomputes every number quoted in README, SUBMISSION and the slides.
- `node tests/verify-raw-data.mjs` (network): all terrain cells vs the Zenodo GeoTIFF, mission points vs NASA's live waypoint file.
- Serve the repo: `python3 -m http.server 8790`, then `node tests/edge-browser.mjs` (every crisis combination, delays, extreme inputs, drags, 3D; fails on console errors, NaN or a wrong verdict) and `node tests/touch-3d.mjs` (pinch, tilt, reset on a phone screen).
- Safari engine: Playwright WebKit was installed in a temp folder (`/private/tmp/claude-501/pw`, may be gone). The iPad itself was checked by the team and works.
- Slides: `node slides/shots.mjs` recaptures screenshots, `node slides/render.mjs <png-dir>` writes `slides/LIFELINE-slides.pdf`; `node slides/render.mjs <png-dir> submission.html slides/LIFELINE-submission.pdf` writes the submission deck; `node slides/render.mjs <png-dir> intro.html slides/LIFELINE-intro.pdf` writes the intro deck.

If a change makes a check fail, fix the change, not the check.

## Deploying

The command line has no GitHub login. Commit locally, then the team presses **Push origin** in GitHub Desktop (opened with `open -a "GitHub Desktop" <repo>`). Pages updates about a minute later. This repo's git author is set locally to "Team Six Seven <noreply@users.noreply.github.com>" (older commits still show a personal email; rewriting history was not requested).

## Data and sources

- Terrain: Persaud, Putri & Muller (2021), 30-m HRSC DTM Mosaic of Gale Crater, Zenodo doi:10.5281/zenodo.5808354, CC BY 4.0 (ESA Mars Express). Slice rows 3420–3640, columns 2893–3051, stored as uint16 = round((z + 5000) × 5). All 35,139 cells verified within 0.1 m; georeferencing exact.
- Rover: NASA MMGIS `MSL_waypoints.json`. Terrain vs 885 rover altitudes: RMSE 11.7 m over 823 m of relief.
- Images: A Mastcam `4564ML1077420021801947E01` (NASA/JPL-Caltech/MSSS); B Front Hazcam `FLB_813578617EDR_F1191722FHAZ00302M`, NASA's own caption: the "Valle de la Luna" block in the "Monte Grande" hollow, drilled 18–19 Oct 2025 (Curiosity Blog sols 4689–4694); C HiRISE `ESP_087149_1750` browse crop, labelled orbital (NASA/JPL-Caltech/University of Arizona).
- REMS: NASA MSL weather feed (Centro de Astrobiología), outreach product; 123 sols; air −82 to −5 °C, 679–782 Pa; daylight window latest sunrise 05:52, earliest sunset 17:22.
- RAD: 0.64 ± 0.12 mSv/day (Hassler et al. 2014, Science 343, doi:10.1126/science.1244797). 0.67 was a press-release figure; do not use it.

## Model values and sources

- **Apollo**, one document: P. Benjamin, *Apollo 15 EVA Capability and Constraints Envelopes*, Bellcomm memo B70 10028, 13 Oct 1970, NASA-CR-111182. p. 1: 700/1050/1200 BTU/h (ride/work/walk), 20% pad on the walk back, rover 8 and 10 km/h, 0.95 h emergency oxygen. p. 2: 3.1 km walking radius (model reproduces 3.12 km). Apollo drew this as a fixed circle before the mission with an assumed 50/50 ride/work traverse: that is what LIFELINE makes live. LIFELINE also pads the ride back (more cautious).
- **NASA Artemis suit plan**: *xEVA System Concept of Operations*, EVA-EXP-0042 Rev B (Oct 2020). p. 40: walking ~2 km/h on level regolith. pp. 29, 36: EVAs up to 8 h, nominal 6 ± 2 h. p. 41: a second rover that can rescue the crew.
- Context for walking on Mars: NASA/TP-2009-214796 and TP-2010-216115 (suited subjects near maximum effort at 1.5 m/s in Mars gravity).
- DEFAULTS: speed 2.0 km/h, O2 8 h, water 8 h, emergency O2 57 min, pad 20%, gate 30 min, payload 10 kg, slope limit 25°, sand 40% (unused until THEMIS), rover 8 / emergency 10 km/h, station 30 min, max EVA 6 h, start 08:00, storm warning 30 min.
- **Still team choices** (labelled on the page): 30 min per stop, 08:00 start, slope term e^(−0.045·slope°), payload effect, injured factor (half speed, +30% effort), 30 min storm warning, 30 min gate, 25° slope limit, terrain shelter rule (flat ground < 10° at the foot of a slope > 18°).

## Current results (default values; verify with tests/audit-numbers.js)

Verdict **GO FOR EVA**. Plan 2 h 57 (out 08:00, home 10:57). All three stops visited. Worst rover-failure margin 32 min (working at C, T+2:14); worst suit-failure margin 15 min (at B). Time spare 3 h 03. 178 minutes tested per crisis, 356 single failures in total. Route 10.2 km, climb 492 m, steepest slope 16°, 0.18 km above 15°, 41% within 100 m of Curiosity's track. Sensitivity: −20% suit capacity → −44 min, −20% walking speed → −31 min (both NO-GO).

| Crisis | Worst margin | Unsafe minutes |
|---|---|---|
| Rover fails | 32 min | 0 |
| Suit fails | 15 min | 0 |
| Solar storm | 23 min | 0 |
| Crew injured (rover works) | > 8 h | 0 |
| Suit fails + storm | 15 min | 0 |
| Rover fails + injured | −288 min | 136 |
| Rover fails + suit fails | −203 min | 158 |

| Late at stop A | Gate decision | Home by | Worst walk-back margin |
|---|---|---|---|
| on time | Plan A (all stops) | T+2:57 | 32 min |
| 15 min | Plan B (skip B) | T+2:40 | 45 min |
| 30 min | Plan B | T+2:55 | 34 min |
| 45 min | Plan C (go home) | T+2:34 | 66 min |
| 60 min | Plan C | T+2:49 | 54 min |

Crisis logic: the crew must always get home on the reserve; a solar storm adds "reach a terrain shelter before the warning ends" and never replaces it (a shelter has no oxygen). Message: every single failure leaves a way home at every minute; two at once do not, as in Apollo, and the tool shows where.

## Decisions and fixes log (14–15 Nov)

- Real stop images; REMS data; submission text; raw data verified; stop C distance corrected to ~60 m.
- Bugs fixed: page froze on a huge typed value (inputs clamped) and at slope limit 10 (infinite loop); pressing C grabbed B; favicon console error; failure count 223 → now 178 per crisis with the new plan; older iPad Safari blank map ("Can't find variable: params", fixed with an IIFE); a storm made double failures look safe; 3D pinch drifted on a scrolled page.
- Team decisions: A → B → C order; keep the 30 min gate; NASA Artemis suit values + 30 min stops; Realistic Mars 3D; skip the user test for now (no results may be claimed); no extra crises or shelters.
- UI review fixes (15 Nov, after the freeze, team-approved items 1, 2, 4, 5, 6, 7, 11): the 15 assumption inputs and Science value are `type="text" inputmode="decimal|numeric"` so every browser shows Latin digits (Arabic-Indic digits typed in are read as numbers; min/max clamping unchanged); a dragged stop says "moved … from the original site; the photo and notes show the original site" instead of "Curiosity site"; gate (30 min) and slope limit (25°) listed under team choices; Why-GO line explains the gate applies to the rover-failure margin and the suit margin only has to stay above zero (tight below 10 min); sensitivity row "Suit capacity (oxygen and cooling water)"; wrist tiles "Margin (rover fails)" (crisis name during a crisis) and "Next: … (straight line)". Item 3: label only, "Turn back by (suit)" (it counts only suit capacity to zero margin, not the 6 h or sunset limits; it differs from the backup card's Leave by, which keeps the gate). Slides updated the same day: new wrist screenshot (walk.png) and gate + slope limit in both decks' team-choice lists; both PDFs re-rendered.

## If more time

1. Optional: add an "Apollo 1970: a fixed 3.1 km circle → LIFELINE: walking time from every 30 m cell, every minute" line to slide 3 (offered, not yet approved).
2. Run the user test in `docs/user-test/` with adults (18+) and put real results on slide 7.
3. Later: THEMIS sand layer, HiRISE 1 m terrain for the final route, live telemetry, second rover or caches for double failures.

## Working rules

- Do not invent numbers, coordinates, sources or user results. If unknown, say so.
- Keep README, SUBMISSION, the slides and this file in sync with the test output.
- Commit messages in English; keep `main` deployable; run the tests before every commit.
