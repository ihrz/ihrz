module.exports = {
    name: 'snipe',
    description: 'Get the last message deleted in the channel',
    run: async (client, interaction) => {

        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        const db = require("quick.db")
            var old_message = db.fetch(`snipe_${interaction.guild.id}_${interaction.channel}`)
            var infoTag = db.fetch(`snipeUserInfoTag_${interaction.guild.id}_${interaction.channel}`)
            var infoPp = db.fetch(`snipeUserInfoPp_${interaction.guild.id}_${interaction.channel}`)
            var time = db.fetch(`snipeTimestamp${interaction.guild.id}_${interaction.channel}`)
            if(!old_message) { return interaction.reply({content: "No message deleted in this channel !"})};
            embed = new MessageEmbed().setColor(client.color).setAuthor(infoTag, infoPp).setDescription(old_message).setTimestamp(time)
            return interaction.reply({embeds: [embed]})
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}