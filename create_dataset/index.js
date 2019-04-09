var sqlite3 = require('sqlite3').verbose();
var Player = require('./player');

let db = new sqlite3.Database('./dataset.db', err => {
  if(err) return console.log(`Error: ${err}`);
  console.log('Initialized SQlite database');
});

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
}, 5000);

// db.close();
