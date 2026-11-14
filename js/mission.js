// Mission definition: habitat, science stops and default assumptions.
// Stops A and B are Curiosity drill sites (NASA waypoint file); stop C is a new site chosen inside the boxwork.
// The habitat is Curiosity's sol 3038 position, chosen because the ground is flat (0.6 deg along the rover track).
var MISSION={
  habitat:{lat:-4.73384,lon:137.40960,source:"Curiosity waypoint, sol 3038"},
  stops:[
  {id:'A',lat:-4.79985,lon:137.38354,value:2,real:true,name:'Stop A, Altadena',goal:'Curiosity drilled here on sol 4564 at the edge of the boxwork. Collect hand samples around the drill hole to compare with the rover’s powder.',photo:'Curiosity Mastcam view of the Altadena drill hole, 8 June 2025'},
  {id:'B',lat:-4.80784,lon:137.38104,value:4,real:true,name:'Stop B, Monte Grande',goal:'Hollow drilled by Curiosity (Valle de la Luna) with the ridge beside it (Nevado Sajama). Sample both by hand, 2 m apart in height.',photo:'Curiosity Front Hazcam view of Valle de la Luna in Monte Grande, 12 Oct 2025'},
  {id:'C',lat:-4.8064,lon:137.3815,value:5,real:false,name:'Stop C, unvisited hollow',goal:'A hollow inside the boxwork about 90 m off the rover’s path. Wheels struggle on the steep hollow edges; boots do not.',photo:'No ground image exists yet. This is why a human goes.'}
]
};
// Defaults shown in the Model panel. Sources: Apollo traverse planning (rates, 20% pad, 0.95 h emergency oxygen, 10 km/h emergency rover).
// Walking speed, suit capacities, payload effect, time in suit and storm warning time are team assumptions (see README).
var DEFAULTS={speed:2.5,o2:8,h2o:7.5,emerg:57,pad:20,gate:30,load:10,slope:25,sand:40,rover:8,roverE:10,station:45,warn:30,maxh:4.25};
