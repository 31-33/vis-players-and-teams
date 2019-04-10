const fetch = require('node-fetch');
const secrets = require('./secrets');
const sharp = require('sharp');
const randomNormal = require('random-normal');

class Player {
    constructor(id, player_name, avatar_path, skill_level){
      this.id = id;
      this.player_name = player_name;
      this.avatar_path = avatar_path;
      this.skill_level = skill_level;
    }

    static createPlayer(id){
      return fetch(`https://www.behindthename.com/api/random.json?usage=ita&number=1&randomsurname=yes&key=${secrets.BehindTheNameKey}`, { method: 'GET' })
        .then(res => res.json())
        .then(
          namedata => {
            fetch('https://thispersondoesnotexist.com/image', { method: 'GET' })
              .then(res => res.buffer())
              .then(imgdata => {
                sharp(imgdata)
                .resize(256, 256)
                .toFile(`avatars/${id}.jpeg`), (err, info) =>
                {
                  if(err) console.log(`Error creating image for id${id}: ${err}`);

                  var skill_val = randomNormal({ mean: 0.5, dev: 0.2});
                  skill_val = skill_val < 0.1 ? 0.1 : skill_val > 1.0 ? 1.0 : skill_val;
                  return new Player(id, `${namedata.names[0]} ${namedata.names[1]}`, `avatars/${id}.jpeg`, skill_val);
                }
              });
          }
        )
    }
}

module.exports=Player;
