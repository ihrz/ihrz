const { 
  Client, 
  Intents, 
  Collection, 
  EmbedBuilder,
  Permissions, 
  ApplicationCommandType, 
  PermissionsBitField, 
  ApplicationCommandOptionType 
} = require('discord.js');

module.exports = {
  name: 'caracteres',
  description: 'XxXDarkProxXX',
  options: [
    {
        name: 'nickname',
        type: ApplicationCommandOptionType.String,
        description: 'your cool nickname to transform !',
        required: true
    }
],

  run: async (client, interaction) => {

    let w=["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9"]
    let r=["𝕒","𝕓","𝕔","𝕕","𝕖","𝕗","𝕘","𝕙","𝕚","𝕛","𝕜","𝕝","𝕞","𝕟","𝕠","𝕡","𝕢","𝕣","𝕤","𝕥","𝕦","𝕧","𝕨","𝕩","𝕪","𝕫","𝔸","𝔹","ℂ","𝔻","𝔼","𝔽","𝔾","ℍ","𝕀","𝕁","𝕂","𝕃","𝕄","ℕ","𝕆","ℙ","ℚ","ℝ","𝕊","𝕋","𝕌","𝕍","𝕎","𝕏","𝕐","ℤ","𝟘","𝟙","𝟚","𝟛","𝟜","𝟝","𝟞","𝟟","𝟠","𝟡"]
    let nw = interaction.options.getString("nickname")
    let n = []
    for(let x = 0; x < nw.length;x++){
    for(let i = 0; i< w.length; i++){
    if(nw[x] !== nw[x].replace(w[i],r[i])){
    n.push(nw[x].replace(w[i],r[i]))
    }
      }
    }
    return interaction.reply({content: n.join("")})
    const filter = (interaction) => interaction.user.id === interaction.member.id;
    }}