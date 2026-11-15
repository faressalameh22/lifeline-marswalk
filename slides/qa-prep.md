# LIFELINE: likely judge questions and short answers

Every number here comes from the tests in the repo (`node tests/run-tests.js`, `node tests/audit-numbers.js`). If you do not know an answer, say so and offer to show it in the live tool.

## The idea

**Isn't this just the Apollo rule? What is new?**
Apollo used the rule as a fixed radius drawn before the mission. LIFELINE computes it live: every minute, every 30 m cell of real terrain, for four kinds of failure and their combinations, and the gates change the plan on their own. It also shows the planner why, and what to change.

**Who would use it?**
The person who plans a crewed walk (EVA) on Mars or the Moon, before the walk and during it. The wrist view is for the crew.

**Why stops A, B, C at Mount Sharp?**
Curiosity is exploring the boxwork ridges there right now. A and B are real Curiosity drill sites; C is a hollow inside the boxwork that no rover has reached (the rover's path passes about 60 m away).

## The numbers

**Where do the numbers come from?**
Apollo values (activity rates, 20% pad, 57 min emergency oxygen, 10 km/h emergency rover speed, 3.1 km radius): the Apollo 15 planning memo, NASA-CR-111182 (1970), pages 1 and 2. Walking speed 2 km/h, an 8 h suit and a 6 h EVA: NASA's xEVA (Artemis) Concept of Operations, EVA-EXP-0042 (2020), pages 29, 36 and 40. Sunrise and sunset: Curiosity REMS. Radiation: Curiosity RAD, 0.64 mSv/day (Hassler et al. 2014).

**Those suit numbers are for the Moon. Why use them on Mars?**
No Mars suit exists yet, so no Mars figures exist. NASA's Artemis plan is the best official source. NASA suited tests show walking in Mars gravity is harder than on the Moon (subjects neared maximum effort at 1.5 m/s), so the slow 2 km/h is on the safe side. Every value can be changed in the tool.

**What is still your own assumption?**
30 min per stop, an 08:00 start, the slope slowdown, the payload and injury effects, the 30 min storm warning and the terrain shelter rule. They are labelled on the page. The sensitivity chart shows what they cost: 20% less suit capacity (−44 min) or 20% slower walking (−31 min) turns today's plan to NO-GO.

**How do you know the model is right?**
Ten checks run in the page and in a test script. The model reproduces Apollo's 3.1 km radius (3.12 km). The terrain matches Curiosity's own altitudes at 885 points within 11.7 m (RMSE) across 823 m of relief. All 35,139 terrain cells equal the original ESA/Zenodo file within 0.1 m. Adding any crisis never makes the margin bigger (4,984 comparisons).

**What resolution is the terrain?**
30 m cells from ESA's HRSC on Mars Express. That is why the 3D view stops zooming at about 1 km; closer would only show blur.

## Failures

**What happens if two things fail at once?**
The tool shows it is not covered: rover + suit leaves −203 min at worst, unsafe in 158 of 178 minutes. That is honest and matches Apollo practice, which planned for one failure at a time. Covering double failures needs a second rover or supply caches; that is our next step. NASA's xEVA Concept of Operations describes a second rover that can rescue the crew (EVA-EXP-0042, p. 41).

**Why does the order go A, B, C and not farthest first?**
The team chose to visit the stops in order. The gates still protect the crew at every minute. With the default values the full plan fits with a 32 min margin. Apollo planners preferred farthest first; the tool lets you compare.

**Does the system detect a failure by itself?**
Not yet. Today the planner tests failures with "what if" buttons, and the margins for a rover or suit failure are shown automatically at every minute. In operations the same model would be fed by suit, rover and space-weather data, so the crew gets the order the moment a failure is detected.

**What is a shelter? Does it save the crew?**
A terrain shelter is flat ground at the foot of a steep slope, where the slope blocks part of the sky during a solar storm. It only protects from radiation; it has no oxygen. The model always also requires the crew to get home on the reserve left.

## Data and challenge

**How is NASA data used? Isn't it just decoration?**
Curiosity's track places the habitat and stops A and B, and validates the terrain. Apollo planning values drive the limits. REMS sunrise and sunset set the daylight limit. RAD gives the dose for the walk. The images (Mastcam, Hazcam, HiRISE) show each stop. The terrain itself is ESA data, a Space Apps partner agency.

**Is the 3D view real?**
The shape is real HRSC elevation (heights exaggerated, labelled). The colours, ripples and pebbles are illustrative detail generated from height and slope; the screen says so. The route, stops, fence and slopes come from the model.

**What does "GO, MARGIN TIGHT" mean?**
Every limit holds, but one is close to its edge: the rover-failure margin under the 30 min gate, the suit-failure margin under 10 min, or less than 15 min of time spare.

## Process

**How did you use AI?**
We used Claude (Anthropic) to research sources, build the model with us, write the code and process the NASA data. The team chose the problem, the site and the mission, reviewed the model and is responsible for the result. There are no AI-generated images.

**Did you test it with users?**
Not yet with real planners; that is on our next-steps list. We tested it on phone, iPad and desktop, in Chrome and Safari's engine, and with automated tests of every crisis, extreme inputs and dragged stops.
