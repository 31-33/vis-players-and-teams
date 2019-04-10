var PlayerPool = require('./player_pool');
var sqlite3 = require('sqlite3').verbose();

db = new sqlite3.Database(`./dataset.db`, err => {
  if(err) return console.log(`Error: ${err}`);
  console.log('Initialized SQlite database');
});

db.run(`PRAGMA foreign_keys = ON;`);
db.run(`CREATE TABLE team_groups (
        id INTEGER PRIMARY KEY,
        team_id INTEGER,
        FOREIGN KEY(team_id) REFERENCES teams(id))`);
db.run(`CREATE TABLE player_groups (
        group_id INTEGER,
        player_id INTEGER,
        FOREIGN KEY(group_id) REFERENCES team_groups(id),
        FOREIGN KEY(player_id) REFERENCES players(id),
        PRIMARY KEY (group_id, player_id))`);
db.run(`CREATE TABLE games (
        id INTEGER PRIMARY KEY,
        home_group INTEGER,
        away_group INTEGER,
        result INTEGER,
        FOREIGN KEY(home_group) REFERENCES team_groups(id),
        FOREIGN KEY(away_group) REFERENCES team_groups(id))`);

db.all('SELECT * FROM players', (err, players) => {
  var pool = new PlayerPool(players, (query, params) => db.run(query, params));

  db.all('SELECT * FROM teams', (err, teams) => {
    var round;
    for(round = 1; round < teams.length; round++){
      // Have each team draft players
      var team_selection = teams.map(t => pool.createTeam(t.id));

      // Each team faces 1 other team (offset from their index by roundNo.)
      team_selection.forEach(home_team => {
        var away_team = team_selection[(home_team.team_id + round) % 10];
        var home_score = teams[home_team.team_id].skill_level;
        var away_score = teams[away_team.team_id].skill_level;
        home_team.team.forEach(player => home_score += player.skill_level);
        away_team.team.forEach(player => away_score += player.skill_level);

        // calculate winner (random chance, weighted by score)
        const winner =
          (Math.random() * (home_score + away_score)) < home_score
          ? 1 : -1;

        // write the game result to the database
        db.run('INSERT INTO games (home_group, away_group, result) VALUES (?, ?, ?)',
          [home_team.group_id, away_team.group_id, winner]);
      })
      // reset pool at end of round
      pool.resetPool();
    }
  });
});
