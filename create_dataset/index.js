var sqlite3 = require('sqlite3').verbose();
var Player = require('./player');
const randomNormal = require('random-normal');

let db = new sqlite3.Database('./dataset.db', err => {
  if(err) return console.log(`Error: ${err}`);
  console.log('Initialized SQlite database');
});

db.run(`CREATE TABLE teams (
        id INTEGER PRIMARY KEY,
        name TEXT,
        skill_level REAL)`);
var teamNames = ["The Incredible Horses",
  "The Peaceful Ants",
  "The Great Tigers",
  "The Giddy Cheetahs",
  "The Tasteful Ferrets",
  "The Beneficial Hyenas",
  "The Lonely Baboons",
  "The Reminiscent Crocodiles",
  "The Smelly Meerkats",
  "The Encouraging Deers"];
for(j = 0; j < teamNames.length; j++){
  db.run('INSERT INTO teams (id, name, skill_level) VALUES (?, ?, ?)',
    [j, teamNames[j], randomNormal({ mean: 3, dev: 1})]);
}


db.run(`CREATE TABLE players (
        id INTEGER PRIMARY KEY,
        name TEXT,
        avatar_path TEXT,
        skill_level REAL)`);
i = 200;
setInterval(() => {
  i = i-1;
  Player.createPlayer(i)
    .then(player => {
      console.log(`Adding player ${i} to file`);
      db.run('INSERT INTO players (id, name, avatar_path, skill_level) VALUES (?, ?, ?, ?)',
        [player.id, player.player_name, player.avatar_path, player.skill_level]);
    })
}, 100);



// db.close();
