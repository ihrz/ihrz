const { Client, Intents, Collection, EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
module.exports = {
    name: 'avatar',
    description: 'See the user avatar !',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user',
            required: false
        }
    ],
    run: async (client, interaction) => {
  
        let msg = await interaction.channel.send(`Loading...`);

        let mentionedUser = interaction.options.getUser("user") || interaction.user;
    
            let embed = new EmbedBuilder()
    
            .setImage(mentionedUser.avatarURL({ format: 'png', dynamic: true, size: 512 }))
            .setColor("#add5ff")
            .setTitle("__**Avatar**__: \`"+ mentionedUser.username+ "\`")
            .setDescription("Look this avatar :D")
            .setTimestamp()
    
        msg.delete()
        return interaction.reply({embeds: [embed]})

      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}