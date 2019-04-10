var weightedRandom = require('weighted-random');

class PlayerPool {

  constructor(data, write_to_db){
    this.storedList = data;
    this.tempList = [...this.storedList];

    this.write_to_db = write_to_db; // callback to db.run

    this.group_index = 0;
  }

  getCurrGroupIndex(){
    return this.group_index++;
  }

  // randomly selects a player from the pool (weighted by skill level)
  // removes that player from the pool for the rest of the round
  rollForBestPlayer(){
    var weights = this.tempList.map(player => player.skill_level);
    var index = weightedRandom(weights);
    var player = this.tempList[index];
    this.tempList.splice(index, 1);
    return player;
  }

  createTeam(team_id, teamsize=11){
    const group_id = this.getCurrGroupIndex();
    this.write_to_db('INSERT INTO team_groups (id, team_id) VALUES (?, ?)',
      [group_id, team_id]);

    var team = [];
    var i;
    for(i = 0; i < teamsize; i++){
      var player = this.rollForBestPlayer();
      team.push(player);
      this.write_to_db('INSERT INTO player_groups (group_id, player_id) VALUES (?, ?)',
         [group_id, player.id]);
    }
    return { group_id, team_id, team };
  }

  // reset the pool
  resetPool(){
    this.tempList = [...this.storedList];
  }
}

module.exports = PlayerPool;
