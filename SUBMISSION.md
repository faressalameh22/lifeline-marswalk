# LIFELINE: submission page text

Text for the NASA Space Apps Challenge 2026 project page. Every number here comes from `node tests/run-tests.js` or from the README; do not change a number without re-running the tests.

---

## Project name

LIFELINE

## Challenge

Interplanetary Survival Guide: Martian Map

## Team

Six Seven, Nablus local event (An-Najah University)

## High-level summary

LIFELINE is a Marswalk planner that applies the Apollo rule "never go farther than you can walk home" to Mars. An EVA planner places science stops on a real map of the boxwork ridges of Mount Sharp in Gale Crater, and LIFELINE checks, at every minute and every place on the route, that the crew can still get home if the rover fails or a suit fails, and that the walk fits the time an astronaut can stay in a suit. It gives one clear answer, GO or NO-GO, explains why, and shows what to change. We tested the plan against 356 simulated failures (a rover failure and a suit failure at each of the 178 minutes) on real terrain: every single failure leaves the crew a safe way home, at every minute of the walk. Two failures at once do not, and the tool shows exactly where.

## Detailed description

**The user and the decision.** The user is the person who plans a crewed excursion (EVA) on Mars. The decision is GO or NO-GO for a walk to three science stops, and what to do on the way when something goes wrong.

**The problem.** On Mars no rescue team can come. A crew far from the habitat must be able to get home on its own, whatever fails. A map that shows where to go is not enough; the planner needs to know, minute by minute, whether the crew can still get back.

**The idea.** Apollo crews never drove farther from the lunar module than they could walk back if the rover failed, and a backpack's emergency oxygen (about 0.95 h) had to last the ride home at 10 km/h. LIFELINE draws both limits on a real Mars map and adds a third one, the time in suit:

1. Walk-back: if the rover fails, the suit reserve must cover the walk home over real terrain, plus a 20% safety pad.
2. Ride-back: if a suit fails, the emergency oxygen must cover the padded ride home.
3. Time and daylight: the whole plan must end inside a 6 h EVA (NASA's nominal suit plan) and before sunset (Curiosity REMS).

**The mission.** The habitat sits on Curiosity's sol 3038 position, chosen because the ground is flat. Stop A (Altadena) and stop B (Monte Grande) are Curiosity drill sites inside the boxwork. Stop C is a new site: a hollow inside the boxwork that Curiosity never reached; its route passes about 60 m away. Wheels struggle on its steep edges; boots do not. No ground image of stop C exists yet. This is why a human goes.

**How it works.** LIFELINE computes the fastest walking time home from every 30 m cell of the terrain (Dijkstra path finding, 8 directions, walking speed reduced on slopes), then tracks how the suit reserve runs down with Apollo activity rates for driving, working and walking. The margin field on the map turns from green to yellow to red as the reserve drops. Decision gates at each stop switch to plan B (skip the lowest-science stop) or plan C (go home) when the margin ahead falls below the gate. A Why GO / Why NO-GO panel names the tightest limit and lists fixes; lowering the safety pad is never offered as a fix.

**What you can try** (live, no login): drag the EVA time slider; press Rover fails, Suit failure, Crew injured or Solar storm (they combine); press Running late and watch the gate switch to plan B; drag stop C far away and read why the verdict turns to NO-GO. A Walk view shows what the astronaut would see on a wrist display.

**Results with default values.** The crew visits A, then B, then C. Verdict: GO FOR EVA. The plan takes 2 h 57 against a 6 h EVA, out at 08:00 and home by 10:57 local time, well before sunset at 17:22 (Curiosity REMS). A suit failure while working at stop B leaves 15 min of emergency oxygen (ride home 35 min, 42 min padded, against 57 min). A rover failure leaves at worst 32 min.

| Crisis, tested at every minute of the plan | Worst margin | Unsafe minutes |
|---|---|---|
| Rover fails | 32 min | 0 |
| Suit fails | 15 min | 0 |
| Solar storm | 23 min | 0 |
| Crew member injured (rover works) | more than 8 h | 0 |
| Suit fails and solar storm | 15 min | 0 |
| Rover fails and crew member injured | −288 min | 136 |
| Rover fails and suit fails | −203 min | 158 |

Running 15 or 30 min late at stop A, the gates switch to plan B (skip B) and the worst walk-back margin stays at 45 and 34 min. At 45 or 60 min late they switch to plan C and send the crew home.

**Validation.** Ten checks run in the page's Validation panel and in a headless test script, and all ten pass:

- With Apollo inputs, the model reproduces Apollo's 3.1 km walking radius (3.12 km).
- The terrain matches Curiosity's own altitudes at 885 waypoints: RMSE 11.7 m across 823 m of relief.
- 178 simulated rover failures and 178 simulated suit failures along the plan, all with a safe way home.
- The path finder is exact on flat ground and never overestimates by more than the 8.2% bound of an 8-direction grid, always on the safe side.
- The walk home is never shorter than a straight line (0 violations in 35,139 cells), and the margin never grows while suits run down.

**Where the numbers come from, and what is still a choice.** Walking speed (2 km/h), suit oxygen and cooling water (8 h) and the 6 h nominal EVA come from NASA's xEVA System Concept of Operations (EVA-EXP-0042, 2020), the Artemis suit plan; no Mars suit figures exist yet. NASA suited tests show walking in Mars gravity is far harder than on the Moon, so a slow pace is the right choice. Still team choices: 30 min per stop, an 08:00 start, the slope slowdown term, payload and injury effects, a 30 min storm warning, the 30 min gate, the 25° slope limit, and the terrain shelter rule (flat ground at the foot of a slope over 18°). With 20% less suit capacity or 20% slower walking, today's plan becomes NO-GO; every value is editable and its effect shows immediately.

**Impact.** LIFELINE turns a crew's safety margin into a number the crew and the planner can check before and during every Marswalk, on real terrain. The same method works for any landing site with an elevation model. Next steps: a sand layer from THEMIS thermal data, a second rover or support crew to cover double failures, and a helmet display for the walking crew.

## NASA data used

- **Curiosity rover traverse (MSL waypoints)**, NASA/JPL MMGIS `MSL_waypoints.json`, the data behind NASA's "Where is Curiosity?" map: 885 waypoints in our map area, used for the habitat, stops A and B, the rover track layer and the terrain validation.
- **Curiosity Mastcam image**, sol 4564 (8 Jun 2025), raw image 4564ML1077420021801947E01: the Altadena drill hole at stop A. Credit NASA/JPL-Caltech/MSSS.
- **Curiosity Front Hazcam image**, sol 4687 (12 Oct 2025), raw image FLB_813578617EDR_F1191722FHAZ00302M: stop B at Monte Grande. Credit NASA/JPL-Caltech.
- **MRO HiRISE image ESP_087149_1750** (28 Feb 2025): orbital view of stop C, a crop of the browse product at about 3 m per pixel. Credit NASA/JPL-Caltech/University of Arizona.
- **Curiosity REMS weather**, NASA MSL weather feed: daily air temperature (−82 to −5 °C), pressure (679 to 782 Pa), sky, and sunrise and sunset for 123 sols, sols 4564 to 4687. Sunrise (latest 05:52) and sunset (earliest 17:22) set the daylight window the plan must fit.
- **Curiosity RAD surface radiation**: 0.64 ± 0.12 mSv/day dose equivalent at Gale Crater (Hassler et al. 2014, Science 343, doi:10.1126/science.1244797; NTRS 20180007641); LIFELINE shows the dose for the planned time outside (about 0.08 mSv for 2 h 57).
- **Apollo traverse planning**: P. Benjamin, *Apollo 15 EVA Capability and Constraints Envelopes*, Bellcomm memorandum B70 10028, 13 Oct 1970, NASA-CR-111182 (N79-73020), first published in NASA's Apollo Lunar Surface Journal; a copy is kept at https://faressalameh22.github.io/lifeline-marswalk/data/refs/NASA-CR-111182_Apollo15_EVA_Capability_and_Constraints_Envelopes_1970.pdf and in the Internet Archive. Source of the activity rates (700/1050/1200 BTU/h), the 20% pad, the 8 and 10 km/h rover speeds, the 0.95 h of emergency oxygen (p. 1) and the 3.1 km walking radius used for validation (p. 2).
- **NASA xEVA System Concept of Operations**, EVA-EXP-0042 Rev. B (Oct 2020): walking pace ~2 km/h on level regolith (p. 40), suit supports EVAs of up to 8 h, nominal 6 ± 2 h (pp. 29, 36). Source of the walking speed, suit oxygen and cooling water, and EVA length.
- **NASA suited walking tests**: Norcross et al., NASA/TP-2009-214796 (2009) and NASA/TP-2010-216115 (2010), used as context for the walking-speed assumption.

## Space Agency Partner and other data

- **ESA Mars Express HRSC**: 30-m HRSC DTM Mosaic of Gale Crater, Persaud, Putri & Muller (2021), Zenodo, doi:10.5281/zenodo.5808354, CC BY 4.0. This is the terrain the whole model runs on: a 159 by 221 cell slice read directly from the GeoTIFF.
- **Centro de Astrobiología (CAB, Spain)** provides the REMS values in NASA's MSL weather feed. REMS is the Spanish-built weather station on Curiosity.

## Use of AI

We used Claude (Anthropic) to research past winners and NASA sources, to design the walk-back model with us, to write the code, to extract the terrain slice and rover waypoints, and to find and process the stop images and REMS readings from NASA's archives. The team chose the problem, the site and the mission, reviewed the model and its assumptions, and is responsible for the result. No AI-generated images are used; every image in the project is a real NASA image, credited where it is shown.

## Links

- Live demo: https://faressalameh22.github.io/lifeline-marswalk/
- Code and data: https://github.com/faressalameh22/lifeline-marswalk
- Slides (PDF, 7 slides, readable without a presenter): https://faressalameh22.github.io/lifeline-marswalk/slides/LIFELINE-submission.pdf

This project is not endorsed by NASA.
