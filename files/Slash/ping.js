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
    name: 'ping',
    description: 'Pong in ms xd',
    run: async (client, interaction) => {
  
        const oki = ":ballot_box_with_check:"
        const nope = ":regional_indicator_x:";
        let début = Date.now();
       
        interaction.reply(':ping_pong:')
        .then((m) => interaction.editReply(`【${oki}】__**Pong**__ : \ ${Date.now() - 199 - début}ms`));
        
      
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}