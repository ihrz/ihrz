module.exports = {
    name: 'snipe',
    description: 'Get the last message deleted in the channel',
    run: async (client, interaction) => {

        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
            var based = await db.get(`${interaction.guild.id}.GUILD.SNIPE.${interaction.channel.id}`)

            if(!based) { return interaction.reply({content: "No message deleted in this channel !"})};

            embed = new MessageEmbed().setColor(client.color)
            .setAuthor(based.snipeUserInfoTag, based.snipeUserInfoPp)
            .setDescription(based.snipe).setTimestamp(based.snipeTimestamp);
            
            const filter = (interaction) => interaction.user.id === interaction.member.id;
            return interaction.reply({embeds: [embed]})
      }}