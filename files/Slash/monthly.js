const { QuickDB } = require("quick.db");
const db = new QuickDB();
const ms = require('ms')
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
    name: 'monthly',
    description: 'Earn your monthly gain from you work',
    run: async (client, interaction) => {
    let timeout = 2592000000
    let amount = 5000
    let monthly = await await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly`);

    if (monthly !== null && timeout - (Date.now() - monthly) > 0) {
        let time = ms(timeout - (Date.now() - monthly));

        interaction.reply({content: `Sorry you must wait **${time}** before running this command!`})
    } else {
        let embed = new EmbedBuilder()
        .setAuthor({ name: `Monthly`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
        .setColor("#a4cb80")
        .setDescription(`**monthly Reward**`)
        .addFields({name: "Collected", value: `${amount}🪙`})
    interaction.reply({embeds: [embed]})
    db.add(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, amount)
    db.set(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.monthly`, Date.now())
    }
      const filter = (interaction) => interaction.user.id === interaction.member.id;
}}