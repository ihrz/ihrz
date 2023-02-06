module.exports = {
    name: 'snipe',
    description: 'Get the last message deleted in the channel',
    run: async (client, interaction) => {

        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
            var old_message = await db.get(`snipe_${interaction.guild.id}_${interaction.channel}`)
            var infoTag = await db.get(`snipeUserInfoTag_${interaction.guild.id}_${interaction.channel}`)
            var infoPp = await db.get(`snipeUserInfoPp_${interaction.guild.id}_${interaction.channel}`)
            var time = await db.get(`snipeTimestamp${interaction.guild.id}_${interaction.channel}`)
            if(!old_message) { return interaction.reply({content: "No message deleted in this channel !"})};
            embed = new MessageEmbed().setColor(client.color).setAuthor(infoTag, infoPp).setDescription(old_message).setTimestamp(time)
            return interaction.reply({embeds: [embed]})
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}