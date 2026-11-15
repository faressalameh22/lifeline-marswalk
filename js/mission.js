// Mission definition: habitat, science stops and default assumptions.
// Stops A and B are Curiosity drill sites (NASA waypoint file); stop C is a new site chosen inside the boxwork.
// The habitat is Curiosity's sol 3038 position, chosen because the ground is flat (0.6 deg along the rover track).
var MISSION={
  habitat:{lat:-4.73384,lon:137.40960,source:"Curiosity waypoint, sol 3038"},
  stops:[
  {id:'A',lat:-4.79985,lon:137.38354,value:2,real:true,name:'Stop A, Altadena',goal:'Curiosity drilled here on sol 4564 at the edge of the boxwork. Collect hand samples around the drill hole to compare with the rover’s powder.',photo:'Curiosity Mastcam view of the Altadena drill hole, 8 June 2025',img:'data/img/stop-a-mastcam-sol4564.jpg',focus:'50% 55%',cap:'Altadena drill hole and tailings. Curiosity Mastcam (left), sol 4564, 8 June 2025. Raw image 4564ML1077420021801947E01.',credit:'NASA/JPL-Caltech/MSSS'},
  {id:'B',lat:-4.80784,lon:137.38104,value:4,real:true,name:'Stop B, Monte Grande',goal:'Hollow drilled by Curiosity (Valle de la Luna) with the ridge beside it (Nevado Sajama). Sample both by hand, 2 m apart in height.',photo:'Curiosity Front Hazcam view of Valle de la Luna in Monte Grande, 12 Oct 2025',img:'data/img/stop-b-fhaz-sol4687.jpg',focus:'50% 38%',cap:'Valle de la Luna in Monte Grande. Curiosity Front Hazcam (left), sol 4687, 12 Oct 2025. Raw image FLB_813578617EDR_F1191722FHAZ00302M.',credit:'NASA/JPL-Caltech'},
  {id:'C',lat:-4.8064,lon:137.3815,value:5,real:false,name:'Stop C, unvisited hollow',goal:'A hollow inside the boxwork that Curiosity never reached: its route passes about 60 m away (90 m before its later drive of sols 4810 to 4813). Wheels struggle on the steep hollow edges; boots do not.',photo:'No ground image exists yet. This is why a human goes.',img:'data/img/stop-c-hirise-ESP_087149_1750.jpg',orbital:true,cap:'Orbital view, not a ground photo. HiRISE ESP_087149_1750 (28 Feb 2025), browse product at about 3 m per pixel, crop about 710 m across, north up. Ring: stop C. No ground image exists yet. This is why a human goes.',credit:'NASA/JPL-Caltech/University of Arizona'}
]
};
// Defaults shown in the Model panel. Sources: Apollo traverse planning (rates, 20% pad, 0.95 h emergency oxygen, 10 km/h emergency rover).
// Walking speed, suit capacities, payload effect, time in suit and storm warning time are team assumptions (see README).
// NASA xEVA System Concept of Operations, EVA-EXP-0042 Rev B (2020): walking ~2 km/h on level regolith (p. 40);
// suit supports EVAs of up to 8 h, nominal 6 h (6 +/- 2 h) (pp. 29, 36). Station time 30 min is a team choice.
var DEFAULTS={speed:2.0,o2:8,h2o:8,emerg:57,pad:20,gate:30,load:10,slope:25,sand:40,rover:8,roverE:10,station:30,warn:30,maxh:6,start:8};  // start: EVA start, hours of Mars local time (team choice)
