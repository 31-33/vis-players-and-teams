var express = require('express');
var sqlite3 = require('sqlite3').verbose();

db = new sqlite3.Database(`./dataset.db`, sqlite3.OPEN_READONLY, err => {
  if(err) return console.log(`Error: ${err}`);
  console.log('Initialized SQlite database');
});

var server = express();

server.use('', express.static(__dirname));

server.get('/avatars/:filename', (req, res) => {
  var options = {
    root: __dirname,
  };

  var filename = req.params.filename;
  res.sendFile(filename, options);
});

// fetch the list of players
// for each player we want:
//    -player id, name, avatar path
//    -player win/loss counts
server.get('/players', (req, res) => {
  db.all(`SELECT id, name, avatar_path, SUM(wins) AS wins, SUM(losses) AS losses FROM
            (SELECT player.id, player.name, player.avatar_path, SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS wins, SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS losses FROM games
            INNER JOIN player_groups pgroup ON games.home_group = pgroup.group_id
            INNER JOIN players player ON pgroup.player_id = player.id
            GROUP BY player.id
          UNION ALL
            SELECT player.id, player.name, player.avatar_path, SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS wins, SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS losses FROM games
            INNER JOIN player_groups pgroup ON games.away_group = pgroup.group_id
            INNER JOIN players player ON pgroup.player_id = player.id
            GROUP BY player.id)
          GROUP BY id
          ORDER BY wins DESC, losses ASC`, (err, players) => {
    res.send(players);
  });
});

// for the given player, fetch relationship information:
//    -teams they have played with and against (win/loss counts)
//    -players they have played with and against (win/loss counts)
server.get('/players/:id', (req, res) => {
  const playerId = req.params.id;
  db.all(`SELECT id, name, SUM(with_wins) AS with_wins, SUM(with_losses) AS with_losses, SUM(against_wins) AS against_wins, SUM(against_losses) AS against_losses, SUM(with_wins + with_losses + against_wins + against_losses) AS game_count FROM(
            SELECT hometeam.id, hometeam.name,
              SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) AS with_wins,
              SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) AS with_losses,
              0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN player_groups playergroup ON games.home_group = playergroup.group_id
            INNER JOIN team_groups hometeamgroup ON games.home_group = hometeamgroup.id
            INNER JOIN teams hometeam ON hometeamgroup.team_id = hometeam.id
            WHERE playergroup.player_id = ${playerId}
            GROUP BY hometeam.id
          UNION ALL
            SELECT awayteam.id, awayteam.name,
              SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) AS with_wins,
              SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) AS with_losses,
              0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN player_groups playergroup ON games.away_group = playergroup.group_id
            INNER JOIN team_groups awayteamgroup ON games.away_group = awayteamgroup.id
            INNER JOIN teams awayteam ON awayteamgroup.team_id = awayteam.id
            WHERE playergroup.player_id = ${playerId}
            GROUP BY awayteam.id
          UNION ALL
            SELECT hometeam.id, hometeam.name,
              0 AS with_wins, 0 AS with_losses,
              SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) AS against_wins,
              SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN player_groups playergroup ON games.away_group = playergroup.group_id
            INNER JOIN team_groups hometeamgroup ON games.home_group = hometeamgroup.id
            INNER JOIN teams hometeam ON hometeamgroup.team_id = hometeam.id
            WHERE playergroup.player_id = ${playerId}
            GROUP BY hometeam.id
          UNION ALL
            SELECT awayteam.id, awayteam.name,
              0 AS with_wins, 0 AS with_losses,
              SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) AS against_wins,
              SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN player_groups playergroup ON games.home_group = playergroup.group_id
            INNER JOIN team_groups awayteamgroup ON games.away_group = awayteamgroup.id
            INNER JOIN teams awayteam ON awayteamgroup.team_id = awayteam.id
            WHERE playergroup.player_id = ${playerId}
            GROUP BY awayteam.id)
          GROUP BY id
          ORDER BY game_count DESC, with_wins DESC, against_wins DESC, with_losses DESC, against_losses DESC`, (err, teams) => {

  db.all(`SELECT id, name, avatar_path, SUM(with_wins) AS with_wins, SUM(with_losses) AS with_losses, SUM(against_wins) AS against_wins, SUM(against_losses) AS against_losses, SUM(with_wins + with_losses + against_wins + against_losses) AS game_count
          FROM(
            SELECT relatedplayers.id, relatedplayers.name, relatedplayers.avatar_path,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS with_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS with_losses,
            	0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN player_groups selectedgroup ON games.home_group = selectedgroup.group_id
            INNER JOIN player_groups relatedgroup ON games.home_group = relatedgroup.group_id
            INNER JOIN players relatedplayers ON relatedgroup.player_id = relatedplayers.id
            WHERE selectedgroup.player_id = ${playerId}
            GROUP BY relatedgroup.player_id
          UNION ALL
            SELECT relatedplayers.id, relatedplayers.name, relatedplayers.avatar_path,
            	0 AS with_wins, 0 AS with_losses,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS against_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN player_groups selectedgroup ON games.home_group = selectedgroup.group_id
            INNER JOIN player_groups relatedgroup ON games.away_group = relatedgroup.group_id
            INNER JOIN players relatedplayers ON relatedgroup.player_id = relatedplayers.id
            WHERE selectedgroup.player_id = ${playerId}
            GROUP BY relatedgroup.player_id
          UNION ALL
            SELECT relatedplayers.id, relatedplayers.name, relatedplayers.avatar_path,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS with_wins,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS with_losses,
            	0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN player_groups selectedgroup ON games.away_group = selectedgroup.group_id
            INNER JOIN player_groups relatedgroup ON games.home_group = relatedgroup.group_id
            INNER JOIN players relatedplayers ON relatedgroup.player_id = relatedplayers.id
            WHERE selectedgroup.player_id = ${playerId}
            GROUP BY relatedgroup.player_id
          UNION ALL
            SELECT relatedplayers.id, relatedplayers.name, relatedplayers.avatar_path,
            	0 AS with_wins, 0 AS with_losses,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS against_wins,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN player_groups selectedgroup ON games.away_group = selectedgroup.group_id
            INNER JOIN player_groups relatedgroup ON games.away_group = relatedgroup.group_id
            INNER JOIN players relatedplayers ON relatedgroup.player_id = relatedplayers.id
            WHERE selectedgroup.player_id = ${playerId}
            GROUP BY relatedgroup.player_id)
          GROUP BY id
          ORDER BY game_count DESC, with_wins DESC, against_wins DESC, with_losses DESC, against_losses DESC`, (err, players) => {
    res.send({teams, players});
  });
  });
});

// fetch the list of teams
// for each team, we want:
//    -team id, name
//    -team win/loss counts
server.get('/teams', (req, res) => {
  db.all(`SELECT id, name, SUM(wins) AS wins, SUM(losses) AS losses FROM
            (SELECT home.id, home.name,
              SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS wins,
              SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS losses
            FROM games
            INNER JOIN team_groups homegroup ON games.home_group = homegroup.id
            INNER JOIN teams home ON homegroup.team_id = home.id
            GROUP by home.id
          UNION ALL
            SELECT away.id, away.name,
              SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS wins,
              SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS losses
            FROM games
            INNER JOIN team_groups awaygroup ON games.away_group = awaygroup.id
            INNER JOIN teams away ON awaygroup.team_id = away.id
            GROUP by away.id)
          GROUP by id
          ORDER BY wins DESC`, (err, teams) => {
    res.send(teams);
  });
});

// for the given team, fetch relationship information:
//    -teams they have played with and against (win/loss counts)
//    -players they have played with and against (win/loss counts)
server.get('/teams/:id', (req, res) => {
  const teamId = req.params.id;
  db.all(`SELECT id, name, SUM(wins) AS wins, SUM(losses) AS losses FROM
            (SELECT home.id, home.name, SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS wins, SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS losses FROM games
            INNER JOIN team_groups homegroup ON games.home_group = homegroup.id
            INNER JOIN teams home ON homegroup.team_id = home.id
            INNER JOIN team_groups awaygroup ON games.away_group = awaygroup.id
            INNER JOIN teams away ON awaygroup.team_id = away.id
            WHERE away.id = ${teamId}
            GROUP by home.id
          UNION ALL
            SELECT away.id, away.name, SUM(CASE WHEN games.result < 0 THEN -result ELSE 0 END) AS wins, SUM(CASE WHEN games.result > 0 THEN result ELSE 0 END) AS losses FROM games
            INNER JOIN team_groups homegroup ON games.home_group = homegroup.id
            INNER JOIN teams home ON homegroup.team_id = home.id
            INNER JOIN team_groups awaygroup ON games.away_group = awaygroup.id
            INNER JOIN teams away ON awaygroup.team_id = away.id
            WHERE home.id = ${teamId}
            GROUP by away.id)
          GROUP by id
          ORDER BY wins DESC`, (err, teams) => {
  db.all(`SELECT id, name, avatar_path, SUM(with_wins) AS with_wins, SUM(with_losses) AS with_losses, SUM(against_wins) AS against_wins, SUM(against_losses) AS against_losses, SUM(with_wins + with_losses + against_wins + against_losses) AS game_count FROM
            (SELECT withplayers.id, withplayers.name, withplayers.avatar_path,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS with_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS with_losses,
            	0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN team_groups teamgroup ON games.home_group = teamgroup.id
            INNER JOIN player_groups playergroup ON games.home_group = playergroup.group_id
            INNER JOIN players withplayers ON playergroup.player_id = withplayers.id
            WHERE teamgroup.team_id = ${teamId}
            GROUP BY withplayers.id
          UNION ALL
            SELECT againstplayers.id, againstplayers.name, againstplayers.avatar_path,
            	0 AS with_wins, 0 AS with_losses,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS against_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN team_groups teamgroup ON games.home_group = teamgroup.id
            INNER JOIN player_groups playergroup ON games.away_group = playergroup.group_id
            INNER JOIN players againstplayers ON playergroup.player_id = againstplayers.id
            WHERE teamgroup.team_id = ${teamId}
            GROUP BY againstplayers.id
          UNION ALL
            SELECT withplayers.id, withplayers.name, withplayers.avatar_path,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS with_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS with_losses,
            	0 AS against_wins, 0 AS against_losses
            FROM games
            INNER JOIN team_groups teamgroup ON games.away_group = teamgroup.id
            INNER JOIN player_groups playergroup ON games.away_group = playergroup.group_id
            INNER JOIN players withplayers ON playergroup.player_id = withplayers.id
            WHERE teamgroup.team_id = ${teamId}
            GROUP BY withplayers.id
          UNION ALL
            SELECT againstplayers.id, againstplayers.name, againstplayers.avatar_path,
            	0 AS with_wins, 0 AS with_losses,
            	SUM(CASE WHEN games.result > 0 THEN 1 ELSE 0 END) AS against_wins,
            	SUM(CASE WHEN games.result < 0 THEN 1 ELSE 0 END) AS against_losses
            FROM games
            INNER JOIN team_groups teamgroup ON games.away_group = teamgroup.id
            INNER JOIN player_groups playergroup ON games.home_group = playergroup.group_id
            INNER JOIN players againstplayers ON playergroup.player_id = againstplayers.id
            WHERE teamgroup.team_id = ${teamId}
            GROUP BY againstplayers.id)
          GROUP BY id
          ORDER BY game_count DESC, with_wins DESC, against_wins DESC, with_losses DESC, against_losses DESC`, (err, players) => {
    res.send({teams, players});
  });
  });
});


server.listen(3000);
