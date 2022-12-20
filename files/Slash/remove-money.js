const db = require('quick.db')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');


module.exports = {
    name: 'remove-money',
    description: 'remove money to the bank of the typed user',
    options: [
        {
            name: 'amount',
            type: 'NUMBER',
            description: 'amount of $ you want add',
            required: true
        },
        {
          name: 'member',
          type: 'USER',
          description: 'the member you want to add the money',
          required: true
        }
    ],
    run: async (client, interaction) => {
    
        const filter = (interaction) => interaction.user.id === interaction.member.id;
  

        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")
        }

        var amount = interaction.options.getNumber("amount")
        let user = interaction.options.get("member")
    db.subtract(`money_${interaction.guild.id}_${user.user.id}`, amount)
    let bal = await db.fetch(`money_${interaction.guild.id}_${user.user.id}`)

    let embed = new MessageEmbed()
    .setAuthor(`Removed Money!`, `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`)
    .addField(`Amount`, `${amount}$`)
    .addField(`Balance Updated`, `${bal}$`)
    .setColor("RED") 
    .setTimestamp()

    return interaction.reply({embeds: [embed]})
}}