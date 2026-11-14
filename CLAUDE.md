# CLAUDE.md: LIFELINE handoff

Read this first. It carries every decision made so far, so you do not need to re-ask the team.

## Who and when

- Team **Six Seven** (5 people, 3 laptops, 1 iPad), NASA Space Apps Challenge 2026, **Nablus local event** (An-Najah University).
- Team contact: Iyad. **Talk to the team in Arabic.** Everything the judges see (site, README, slides, submission page) is in **English**.
- Challenge: **Interplanetary Survival Guide: Martian Map** (layered map from several NASA missions to plan a safe Marswalk with new science).
- Target award category: **Best Mission Concept**. Realistic goal: win locally and be nominated for global judging.
- **Deadline: Sunday 15 Nov 2026, 23:59 Nablus time (UTC+2).** Plan: first full submission by 16:00, final by 20:00. No new features after Sunday noon.
- Local judges **read the slides and open the demo; there is no live pitch or Q&A.** Everything must explain itself.

## Live links

- Site (GitHub Pages, main branch, root): https://faressalameh22.github.io/lifeline-marswalk/
- Repo: https://github.com/faressalameh22/lifeline-marswalk
- Verified live on 14 Nov 20:36: verdict GO FOR EVA, Validation panel 10/10 PASS.

## Submission rules that can disqualify us

- Demo is either **≤7 slides (title included)** or a **≤30 s video**. We chose **slides**.
- All submission text and linked material in **English**.
- Every link public, no login.
- NASA data must be used (we do). Partner-agency data is a plus (ESA HRSC terrain).
- AI use must be disclosed (README has a section; repeat it on the submission page). AI images need a visible watermark and must not use NASA logos or branding. Do not put "NASA" in names or logos.
- All team members registered to the same local event.

Judging criteria (each 1 to 5): Influence/Impact, Creativity, Validity, Relevance, Presentation.

## What won before (our own study of 40 global winners, 2022 to 2025)

1. A working thing people can try beats an idea (24 of 40).
2. A named user making a named decision.
3. Named NASA datasets turned into one clear output.
4. Concepts tested against failure (Best Mission Concept winners did this).
5. Awards go by category, not challenge.

Every design choice below follows these.

## The product (locked)

LIFELINE applies the Apollo rule "never go farther than you can walk home" to Mars, using three limits:
1. **Walk-back** if the rover fails (reserve vs padded walking time home over real terrain).
2. **Ride-back** if a suit fails (0.95 h emergency oxygen, emergency rover 10 km/h, from Apollo planning).
3. **Time in suit** (4.25 h, team assumption).

Features in the site: margin field on the map, time slider, crises (rover fails, suit failure, crew injured, solar storm, combinable), running late, plan ladder A/B/C/D, decision gates at each stop, Why GO / Why NO-GO panel with fixes (never lowers the safety pad), backup card (leave-by times), draggable stops, science value per stop, Plan/Walk (wrist display) views, Validation panel with sensitivity chart.

Out of scope, do not add: helmet HUD, satellite imagery basemap, wind, fatigue model, crew size, multiple pages, backend, accounts.

## The mission (locked)

| Point | Lat | Lon | Source |
|---|---|---|---|
| Habitat | −4.73384 | 137.40960 | Curiosity waypoint sol 3038, flat (0.6° along track) |
| A Altadena | −4.79985 | 137.38354 | Curiosity drill site, sol 4564 |
| B Monte Grande | −4.80784 | 137.38104 | Curiosity drill sites Valle de la Luna (hollow) and Nevado Sajama (ridge) |
| C new hollow | −4.80640 | 137.38150 | New site inside the boxwork, never reached by Curiosity: 90 m from the path up to sol 4687, 57 m since the drive of sols 4810-4813 (checked 14 Nov against the live waypoint file) |

A 3.5 km-west stop C was checked and rejected (no hi-res coverage, butte in the way, no boxwork seen). A closer habitat (sol 4456, −4.78771, 137.39224) is the fallback if ever needed.

## Code layout

```
index.html           markup and CSS (dark theme; colors: bg #0F1419, rust #C1440E, route #3DD6F5, safe/tight/danger #2EAD6B/#F2B01E/#D9342B)
js/mission.js        habitat, stops, DEFAULTS (single source of default assumptions)
js/model.js          terrain decode, Dijkstra, plans, gates, crises, validation (no DOM)
js/app.js            UI only
data/terrain.js      HRSC 30 m slice, 159 x 221 cells
data/rover-track.js  885 Curiosity waypoints [lat, lon, elev]
tests/run-tests.js   node tests/run-tests.js  (must print 10 of 10 passed)
```

No build step. Plain scripts, `var` globals in data/mission files so the test runner can load them with `vm`.

**Always run `node tests/run-tests.js` before committing.** Before a release also run `node tests/audit-numbers.js` and `node tests/edge-browser.mjs` (serve the repo on port 8790 first; needs Google Chrome). 14 Nov fixes found by these: inputs are clamped to their min/max (a typed 1e9 froze the page), an unreachable stop no longer loops forever in the Validation panel (slope limit 10 froze the page), pressing on a stop picks the nearest one (pressing C used to grab B), favicon added, failure count is 223 per crisis (T+0:00 to T+3:42 inclusive), not 222. If a change makes a check fail, fix the change, not the check.

## Data provenance

- Terrain: Persaud, Putri & Muller (2021), 30-m HRSC DTM Mosaic of Gale Crater, Zenodo doi:10.5281/zenodo.5808354, CC BY 4.0. File `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif`: uncompressed float32, little-endian, 7584 x 10275, one row per strip, strip 0 at byte 82821, 30336 bytes per row, nodata −32768. Equidistant cylindrical, sphere R = 3,396,190 m, tiepoint x0 = 8054872.398099138, y0 = −176868.30708358268. Our slice: rows 3420 to 3640, columns 2893 to 3051, read with HTTP range requests, stored as uint16 = round((z + 5000) × 5).
- Rover: NASA MMGIS `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json` (fields lat, lon, elev_geoid, sol).
- Validation against data: DEM vs 885 rover altitudes, RMSE 11.7 m over 823 m of relief.
- Raw data verified 14 Nov (`tests/verify-raw-data.mjs`, report in `docs/verification/README.md`): all 35,139 terrain cells equal the Zenodo file within 0.1 m; habitat = sol 3038 waypoint, A = sol 4560-4570 stop (drill sol 4564), B = sol 4687 waypoint where the B image was taken; C never visited, 57 m from the path since sols 4810-4813; C sits inside the polygonal boxwork network on HiRISE ESP_087149_1750 (browse resolution).

## Model defaults and which are sourced

Sourced, one document for all Apollo values: P. Benjamin, "Apollo 15 EVA Capability and Constraints Envelopes", Bellcomm memo B70 10028 (Case 320), 13 Oct 1970, NASA-CR-111182 (N79-73020). Not in NTRS; copy in data/refs/NASA-CR-111182_Apollo15_EVA_Capability_and_Constraints_Envelopes_1970.pdf (the NASA ALSJ URL now redirects; Internet Archive copy: https://web.archive.org/web/2019/https://www.hq.nasa.gov/alsj/19790073512_1979073512.pdf). p. 1 items 5-10: 1050 work / 700 riding / 1200 walking BTU/h at 3.3 km/h, 20% pad on emergency walkback (1440 BTU/h), LRV 8 km/h nominal and 10 km/h emergency, 0.95 h of B/SLSS oxygen for travel home. p. 2: 3.1 km walking radius (model reproduces 3.12 km). The memo pads only the walkback; LIFELINE also pads the rideback (more cautious) and says so on the page.
Suit oxygen 8 h: xEMU "supports EVAs of up to 8 hours (6±2)", Coan, NASA JSC Feb 2021, p. 8, NTRS 20210000827 (lunar suit).
Radiation: 0.64 ± 0.12 mSv/day (Hassler et al. 2014, Science 343, doi:10.1126/science.1244797, NTRS 20180007641). Display only. 0.67 was a 2013 press-release figure; do not use it.

**Team assumptions, still unsourced (labelled as such on the page):** walking speed 2.5 km/h, cooling water 7.5 h (the binding consumable), slope term e^(-0.045 slope), payload effect, injured factor, 4.25 h time in suit, 30 min storm warning. Context for walking speed: NASA/TP-2009-214796 (10 km suited walk in lunar g took 96 min, 1.74 m/s; in Mars g subjects neared max effort at 1.5 m/s) and NASA/TP-2010-216115.

Sensitivity on real terrain: −20% suit capacity → margin −34 min (NO-GO); −20% walking speed → −10 min (NO-GO).

## Current results (default assumptions)

Verdict GO. Tightest limit: suit failure at stop B, ride home 35 min (padded 42) vs 57 min emergency O2 → 15 min spare. Rover-failure worst case 37 min. Plan 3 h 42 vs 4.25 h. Running late 15 to 30 min at B → gate switches to plan B (skips A, lowest science).

## Failure evaluation (real terrain, default assumptions, every minute of the 223-minute plan)

| Crisis | Worst margin | Unsafe minutes |
|---|---|---|
| Rover fails | 37 min | 0 |
| Suit fails | 15 min | 0 |
| Solar storm | 23 min | 0 |
| Crew injured (rover works) | > 6 h | 0 |
| Suit fails + storm | 23 min | 0 |
| Rover fails + injured | −205 min | 178 |
| Rover fails + suit fails | −151 min | 199 |

| Late at stop B | Gate decision | Home by | Worst walk-back margin |
|---|---|---|---|
| 15 min | Plan B (skip A) | T+3:12 | 48 min |
| 30 min | Plan B | T+3:27 | 36 min |
| 45 min | Plan C (go home) | T+2:57 | 56 min |
| 60 min | Plan C | T+3:12 | 44 min |

Message for the slides: every single failure is covered at every minute; two failures at once are not, as in Apollo planning, and the tool shows exactly where. Future work: second rover or support crew.

## Data actually used vs planned

Used: HRSC terrain (ESA Mars Express), Curiosity waypoints (NASA), RAD dose rate (one value), Apollo planning numbers, Curiosity Mastcam and Hazcam images (stops A, B), HiRISE ESP_087149_1750 crop (stop C, orbital), REMS weather for sols 4564 to 4687.
Gap: the challenge suggests at least three kinds of data layered. Close it with items 2 and 3 below (optical and atmospheric), giving four real kinds from two missions and two agencies.

## Remaining work, in priority order

1. **DONE 14 Nov: `slides/LIFELINE-slides.pdf` (source `slides/index.html`, rebuild with `node slides/render.mjs` while serving the repo on port 8790). Physical-rope point dropped: no team argument given.** **Slides (7, English)**: title + team + challenge; the problem; the idea (Apollo rule on Mars, three limits); the tool (screenshots: map, crisis, Why panel); failure tested (crises, plan ladder, gates); data and validation (Apollo 3.12 vs 3.1 km, DEM vs rover 11.7 m, 446 simulated failures (223 + 223), sensitivity chart, honest assumptions); impact and next steps (why not a physical rope; helmet display as future work; THEMIS, REMS). Every title is a full sentence stating the takeaway. Must read without a presenter.
2. **DONE 14 Nov (see README Data table).** **Optical data in the stop cards**: real images stored in the repo (NASA images are public domain; credit NASA/JPL-Caltech and MSSS where applicable). A: Altadena drill hole, Mastcam, 8 Jun 2025 (sol 4564). B: Valle de la Luna in Monte Grande, Front Hazcam, 12 Oct 2025 (sol 4687). C: a HiRISE crop of the site, labelled as orbital, keeping the line "No ground image exists yet. This is why a human goes."
3. **DONE 14 Nov: `data/rems-weather.js`, sols 4564 to 4687, shown in the Environment panel.** **Atmospheric data**: replace "to connect" for REMS with real Curiosity readings (air temperature range and pressure) for sols in the boxwork campaign, from NASA's REMS feed `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json`. Store the values used in `data/`, with the sol range and source. Only show numbers actually read from the feed.
4. **DONE 14 Nov: `SUBMISSION.md`.** **Submission page text (English)**: project name, high-level summary, detailed description, NASA data used, Space Agency Partner and other data (ESA HRSC), use of AI, links (site, repo, slides).
5. Sources for walking speed and suit capacity (team is searching).
6. Optional only if time remains: THEMIS sand layer.

## Working rules

- Do not invent numbers or coordinates. If unknown, say so.
- Keep the README validation table in sync with `node tests/run-tests.js` output.
- Commit messages in English; keep the site deployable from `main` at all times.
