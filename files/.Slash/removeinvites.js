const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'removeinvites',
    description: 'Remove invites from user with this command',
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'the member you want to remove invites',
            required: true
        },
        {
            name: 'amount',
            type: 'NUMBER',
            description: 'Number of invites you want to substract',
            required: true
        }
    ],
    run: async (client, interaction) => {
const user = interaction.options.getMember("member")
const amount = interaction.options.getNumber("amount")

       let a = new MessageEmbed().setColor("RED").setDescription(`You need admin to use this!`)

       if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) { 
            return interaction.reply({embeds: [a]})}

      await db.sub(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.invites`, amount);

      const finalEmbed = new MessageEmbed()
        .setDescription(`Remove ${amount} invites for ${user}`)
        .setColor(`CYAN`)
        .setFooter(
          interaction.guild.name,
          interaction.guild.iconURL({ dynamic: true })
        );
        await db.sub(`${interaction.guild.id}.USER.${user.id}.INVITES.DATA.bonus`, amount);
        interaction.reply({embeds: [finalEmbed]});

    }
  }
