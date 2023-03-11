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
    name: 'snipe',
    description: 'Get the last message deleted in the channel',
    run: async (client, interaction) => {

        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
            var based = await db.get(`${interaction.guild.id}.GUILD.SNIPE.${interaction.channel.id}`)

            if(!based) { return interaction.reply({content: "No message deleted in this channel !"})};

            embed = new EmbedBuilder()
            .setColor("#474749")
            .setAuthor({ name: based.snipeUserInfoTag, iconURL: based.snipeUserInfoPp})
            .setDescription(`\`${based.snipe || 0}\``)
            .setTimestamp(based.snipeTimestamp);
            
            const filter = (interaction) => interaction.user.id === interaction.member.id;
            return interaction.reply({embeds: [embed]})
      }}