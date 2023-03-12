const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
    name: 'remove-money',
    description: 'remove money to the bank of the typed user',
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'amount of $ you want add',
            required: true
        },
        {
          name: 'member',
          type: ApplicationCommandOptionType.User,
          description: 'the member you want to add the money',
          required: true
        }
    ],
    run: async (client, interaction) => {
    
        const filter = (interaction) => interaction.user.id === interaction.member.id;
  

        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")
        

        var amount = interaction.options.getNumber("amount")
        let user = interaction.options.get("member")
    await db.sub(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`, amount)
    let bal = await db.get(`${interaction.guild.id}.USER.${user.user.id}.ECONOMY.money`)

    let embed = new EmbedBuilder()
    .setAuthor({ name: `Removed Money!`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` })
    .addField(`Amount`, `${amount}$`)
    .addFields({name: "Balance Updated", value: `${bal}$`})
    .setColor("#bc0116") 
    .setTimestamp()

    return interaction.reply({embeds: [embed]})
}}