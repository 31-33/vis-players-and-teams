var container = document.getElementById('vis-container');
container.style.height = "100%";

var teamsContainer = document.getElementById('teams-list');
var playersContainer = document.getElementById('players-list');

var options = {
  physics: {
    // enabled: false,
    barnesHut: {
      "gravitationalConstant": -15000,
      "centralGravity": 0.3,
      // "springLength": 40,
      "springConstant": 100,
      "damping": 0.5,
      "avoidOverlap": 0
    },
    timestep: 0.1
  },
  interaction: {
    // dragNodes: false,
    // zoomView: false,
    // dragView: false
  },
  edges: {
    smooth:false
  },
  groups: {
    players: {
      size: 10,
      color:'#00ee00',
      shape: 'circularImage',
      font: {
        color:'#0047ab',
        size: 12
      }
    },
    teams: {
      size: 40,
      color:'#007fff',
      shape: 'circularImage',
      fixed: true,
      font: {
        color:'#000',
        size: 14
      },
      // fixed: true
    }
  }
};

var network = new vis.Network(container, { nodes: [], edges: [] }, options);
// selection event listeners
network.on("selectNode", ctx => {
  ctx.nodes.forEach(node => {
    if(node.startsWith("team")){
      onTeamSelect(node.replace("team", ""));
    }
    else if(node.startsWith("player")){
      onPlayerSelect(node.replace("player", ""));
    }
  });
});
teamsContainer.onchange = (event) => {
  onTeamSelect(event.target.value);
};
playersContainer.onchange = (event) => {
  onPlayerSelect(event.target.value);
};

// create team nodes
fetch('/teams')
  .then(res => res.json())
  .then(json => {
    json.forEach(team => {
      var option = document.createElement("option");
      option.value = team.id;
      option.text = `${team.name} (${team.wins}-${team.losses})`;
      teamsContainer.add(option);
      network.body.data.nodes.add({
        id: 'team'+team.id,
        group: 'teams',
        label: team.name,
        image: `teamlogos/${team.id}.jpeg`,
        x: team.id*150 -700,
        y: -400,
        mass: 30
      });
    });
    console.log(json.map(team => `team${team.id}`));
    network.fit({
      nodes: json.map(team => `team${team.id}`)
    });
  });
// create player nodes
fetch('/players')
  .then(res => res.json())
  .then(json => {
    json.forEach(player => {
      var option = document.createElement("option");
      option.value = player.id;
      option.text = `${player.name} (${player.wins}-${player.losses})`;
      playersContainer.add(option);
      network.body.data.nodes.add({
        id: 'player'+player.id,
        group: 'players',
        label: player.name,
        image: player.avatar_path,
        x: -700 + 75 * (player.id % 20),
        y: 60 * parseInt(player.id / 20) - 200
      });
    });
  });

// handle selection events-- draw edges to show relationships
const onPlayerSelect = (id) => {
  teamsContainer.value = -1;
  playersContainer.value = id;

  network.body.data.edges.clear();

  teamsContainer.childNodes.forEach(item => {
    network.body.data.nodes.update({
      id: `team${item.value}`,
      x: item.value*150 - 700,
      y: -200,
      mass: 150
    });
  });

  playersContainer.childNodes.forEach(item => {
    if(item.value == id){
      network.body.data.nodes.update({
        id: `player${item.value}`,
        fixed: true,
        x: 0,
        y: 0
      });
    }
    else{
      network.body.data.nodes.update({
        id: `player${item.value}`,
        fixed: false,
      });
    }
  });

  network.focus(`player${id}`, {
    // scale: 1.0,
    offset: {
      x: 0,
      y: -200
    },
    locked: true
  });

  fetch(`/players/${id}`)
    .then(res => res.json())
    .then(json => {
      const least_relations = json.players.map(team => team.game_count).sort()[0];
      const most_relations = json.players.map(team => team.game_count).sort().reverse()[0];
      json.teams.forEach(team => {
        network.body.data.edges.add({
          from: `player${id}`,
          to: `team${team.id}`,
          font: {
            size: 10
          },
          title: `with: ${team.with_wins}-${team.with_losses}\n\ragainst: ${team.against_wins}-${team.against_losses}`,
          color: {
            color: `rgb(${255/team.game_count * (team.with_losses + team.against_losses)}, ${255/team.game_count * (team.with_wins + team.against_wins)}, 0)`,
            highlight: `rgb(${255/team.game_count * (team.with_losses + team.against_losses)}, ${255/team.game_count * (team.with_wins + team.against_wins)}, 0)`,
            hover: `rgb(${255/team.game_count * (team.with_losses + team.against_losses)}, ${255/team.game_count * (team.with_wins + team.against_wins)}, 0)`,
            opacity: '1',
            inherit: false
          },
          value: team.game_count
        });
      });
      json.players.forEach(player => {
        network.body.data.edges.add({
          from: `player${id}`,
          to: `player${player.id}`,
          length: 100 + 500*(most_relations - player.game_count)/(most_relations - least_relations),
          color: {
            color: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            highlight: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            hover: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            opacity: '1',
            inherit: false
          },
          font: {
            size: 10
          },
          title: `with: ${player.with_wins}-${player.with_losses}\n\ragainst: ${player.against_wins}-${player.against_losses}`,
          value: player.game_count
        });
      });
    });
};

const onTeamSelect = (id) => {
  playersContainer.value = -1;
  teamsContainer.value = id;

  network.body.data.edges.clear();

  teamsContainer.childNodes.forEach(item => {
    network.body.data.nodes.update({
      id: `team${item.value}`,
      x: (item.value == id) ? 0 : item.value*150 -700,
      y: (item.value == id) ? 0 : -200,
      mass: 150
    });
  });

  playersContainer.childNodes.forEach(item => {
    network.body.data.nodes.update({
      id: `player${item.value}`,
      fixed: false,
    });
  });

  network.focus(`team${id}`, {
    // scale: 1.0,
    offset: {
      x: 0,
      y: -200
    },
    locked: true
  });

  fetch(`/teams/${id}`)
    .then(res => res.json())
    .then(json => {
      const least_relations = json.players.map(team => team.game_count).sort()[0];
      const most_relations = json.players.map(team => team.game_count).sort().reverse()[0];
      json.teams.forEach(team => {
        const game_count = team.wins + team.losses;
        network.body.data.edges.add({
          from: `team${id}`,
          to: `team${team.id}`,
          title: `${team.wins}-${team.losses}`,
          color: {
            color: `rgb(${255/game_count * team.losses}, ${255/game_count * team.wins}, 0)`,
            highlight: `rgb(${255/game_count * team.losses}, ${255/game_count * team.wins}, 0)`,
            hover: `rgb(${255/game_count * team.losses}, ${255/game_count * team.wins}, 0)`,
            opacity: '1',
            inherit: false
          },
          value: game_count
        });
      });
      json.players.forEach(player => {
        network.body.data.edges.add({
          from: `team${id}`,
          to: `player${player.id}`,
          length: 100 + 500*(most_relations - player.game_count)/(most_relations - least_relations),
          title: `with: ${player.with_wins}-${player.with_losses}\n\ragainst: ${player.against_wins}-${player.against_losses}`,
          color: {
            color: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            highlight: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            hover: `rgb(${255/player.game_count * (player.with_losses + player.against_losses)}, ${255/player.game_count * (player.with_wins + player.against_wins)}, 0)`,
            opacity: '1',
            inherit: false
          },
          value: player.game_count
        });
      });
    });
}
