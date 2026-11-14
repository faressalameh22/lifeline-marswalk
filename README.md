# LIFELINE

**Never go farther than you can walk home.**

LIFELINE is a Marswalk planner for the boxwork ridges of Mount Sharp in Gale Crater. It plans a crew excursion to three science stops and checks, at every minute and every place on the route, that the astronauts can still get home if the rover or a suit fails.

Team **Six Seven**, NASA Space Apps Challenge 2026, Nablus local event.
Challenge: *Interplanetary Survival Guide: Martian Map*.

**Live demo:** https://faressalameh22.github.io/lifeline-marswalk/
**Slides (PDF):** https://faressalameh22.github.io/lifeline-marswalk/slides/LIFELINE-slides.pdf

## Try it in four steps

1. Drag the **EVA time** slider. The green safe zone shrinks toward the habitat as the suits run down.
2. Press **Rover fails**. LIFELINE draws the walk home and says how many minutes are left in reserve.
3. Press **Running late**. At the next stop the decision gate switches to plan B and skips the lowest-science stop.
4. Drag stop **C** far away. The verdict turns to **NO-GO**, and the *Why NO-GO* panel lists the changes that would make it safe.

## The idea

On the Moon, Apollo crews followed one rule: never drive farther from the lunar module than you can walk back if the rover fails. They also had a second limit: if a backpack failed, its emergency oxygen (about 0.95 h) had to last the ride home at 10 km/h. LIFELINE draws both limits on a real Mars map and adds a third one, the time an astronaut can stay in the suit.

## The mission

| Point | Latitude | Longitude | What it is |
|---|---|---|---|
| Habitat | −4.73384 | 137.40960 | Curiosity's position on sol 3038, flat ground (0.6° along the rover track) |
| Stop A, Altadena | −4.79985 | 137.38354 | Curiosity drill site, sol 4564, edge of the boxwork |
| Stop B, Monte Grande | −4.80784 | 137.38104 | Curiosity drill sites in a hollow (Valle de la Luna) and on the ridge beside it (Nevado Sajama) |
| Stop C | −4.80640 | 137.38150 | New site: a hollow inside the boxwork about 90 m off the rover's path |

The crew drives to the farthest stop first and works back, so the walk home gets shorter as consumables run down. Stops A and B are where the rover has been; stop C is where a human goes because wheels struggle on steep hollow edges.

## How the model works

```
walk_speed(cell)  = flat_speed × e^(−0.045·slope°) × sand_factor × load_factor     impassable above the slope limit
walk_home(cell)   = fastest walking time to the habitat over the terrain           (Dijkstra, 8 directions)
reserve(t)        = min(oxygen, cooling water) − Σ activity_rate × minutes          drive 0.67 · work 1.00 · walk 1.14
walk-back margin  = reserve(t) ÷ walk_rate − (1 + pad) × walk_home                  if the rover fails
ride-back margin  = emergency_O2 − (1 + pad) × ride_home at emergency speed         if the suit fails
time limit        = the whole plan ends inside the max time in suit
GO                = all three hold along the whole plan
```

Decision gates at each stop: if the margin ahead drops below the gate (30 min by default) or the plan would overrun the suit time limit, LIFELINE switches to plan B (skip the lowest-science stop), then plan C (go home). Plan D covers suit failure and solar storms (ride home, or walk to the nearest terrain shelter).

Crises in the demo: rover failure, suit failure, injured crew member, solar storm, and running late. They can be combined.

## Data

| Layer | Source |
|---|---|
| Terrain | Persaud, Putri & Muller (2021), *30-m HRSC DTM Mosaic of Gale Crater, Mars*, Zenodo, [doi:10.5281/zenodo.5808354](https://doi.org/10.5281/zenodo.5808354), CC BY 4.0. HRSC flies on ESA's Mars Express. |
| Curiosity track and stops A, B | NASA/JPL MMGIS `MSL_waypoints.json`, the data behind NASA's [Where is Curiosity?](https://mars.nasa.gov/maps/location/?mission=Curiosity) map |
| Surface radiation | Hassler et al. (2014), *Science*: 0.67 mSv/day measured by Curiosity's RAD at Gale Crater |
| Walk-back and ride-back limits, activity rates, 20% pad | Apollo traverse planning documents (NASA) |
| Boxwork science | NASA Curiosity mission blog posts, 2025 |
| Weather (REMS) | Curiosity REMS daily air temperature, pressure and sky, sols 4564 to 4687 (8 Jun to 12 Oct 2025, drill site A to drill site B), from NASA's MSL weather feed `mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json` (values by Centro de Astrobiología; outreach product, science data are in the PDS). 123 sols: air −82 to −5 °C, pressure 679 to 782 Pa. Stored unchanged in `data/rems-weather.js` |
| Stop photo A | Curiosity Mastcam (left), sol 4564, 8 Jun 2025, raw image `4564ML1077420021801947E01` (Altadena drill hole). Credit NASA/JPL-Caltech/MSSS. From NASA's [raw image archive](https://mars.nasa.gov/msl/multimedia/raw-images/) |
| Stop photo B | Curiosity Front Hazcam (left), sol 4687, 12 Oct 2025, raw image `FLB_813578617EDR_F1191722FHAZ00302M`. Credit NASA/JPL-Caltech |
| Stop view C (orbital) | MRO HiRISE `ESP_087149_1750` (28 Feb 2025), RED browse product (about 3 m/pixel), crop of 240 x 240 pixels (about 710 m) centred on stop C using the label's equirectangular projection. Credit NASA/JPL-Caltech/University of Arizona. No ground image of stop C exists |

Not yet connected: THEMIS thermal (sand). REMS weather is shown for context in the Environment panel; it does not change the margins.

Stop images are stored in `data/img/` (NASA images are public domain).

The terrain slice was read directly from the Zenodo GeoTIFF with HTTP range requests (the file is uncompressed float32, one row per strip), then stored in `data/terrain.js` at 0.2 m precision.

## Validation

Run `node tests/run-tests.js`. The same ten checks run live in the page's Validation panel.

| Check | Result |
|---|---|
| Path finder, straight line on flat ground | exact (72.0 min vs 72.0 min) |
| Path finder, any direction | worst overestimate 8.2%, the theoretical bound for an 8-direction grid, always on the safe side |
| **Reproduces Apollo's 3.1 km walking radius** | 3.12 km with Apollo inputs |
| **Terrain matches Curiosity's own altitudes** | 885 waypoints, RMSE 11.7 m across 823 m of relief |
| Rover failure at every minute of the plan | 222 simulated failures, worst case 37 min spare |
| Suit failure at every minute | worst case 15 min of emergency oxygen left on arrival |
| Plan fits the time-in-suit limit | 3 h 42 against 4.25 h |
| Margin never grows while suits run down | holds |
| Walk home never shorter than a straight line | 0 violations in 35,139 cells |
| Running 30 min late stays safe | gates switch to plan B, worst margin 36 min |

## Assumptions and what they cost

These values are team assumptions, not sourced numbers: walking speed on flat ground (2.5 km/h), suit oxygen and cooling water (8 h and 7.5 h at work rate), payload effect (−0.5% speed and +1% effort per kg), injured crew factor (half speed, +30% effort), time in suit (4.25 h) and storm warning time (30 min).

The sensitivity chart shows they matter. With 20% less suit capacity or 20% slower walking, today's plan becomes NO-GO. That is the point of the tool: every assumption is visible, editable, and its effect is shown immediately. Lowering the safety pad is never offered as a fix.

## Project layout

```
index.html            page, styles and markup
js/mission.js         habitat, stops, default assumptions
js/model.js           terrain, path finding, plans, gates, crises, validation (no DOM)
js/app.js             map drawing, panels, controls
data/terrain.js       HRSC elevation slice
data/rover-track.js   Curiosity waypoints in the slice
tests/run-tests.js    headless validation run
```

No build step and no server: open `index.html` or serve the folder.

## Use of AI

We used Claude (Anthropic) to research past winners and NASA sources, to design the walk-back model with us, to write the code, and to extract the terrain slice and rover waypoints. The team chose the problem, the site and the mission, reviewed the model and its assumptions, and is responsible for the result. No AI-generated images are used.

## License

Code: MIT (see `LICENSE`). Terrain data: CC BY 4.0, Persaud et al. (2021). NASA data are used under NASA's open data policy. This project is not endorsed by NASA.
