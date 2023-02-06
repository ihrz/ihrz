const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js")

module.exports = {
    name: 'pay',
    description: 'Give money to typed user',
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
  
        let user = interaction.options.getMember("member")
        let amount = interaction.options.getNumber("amount")
        let member = await db.get(`money_${interaction.guildId}_${interaction.member.id}`)
        if (amount.toString().includes('-')) {
            return interaction.reply({content: 'Negative money can not be paid.'})
        }
        if (member < amount.value) {
            return interaction.reply({content: `That's more money than you've got in your balance. try again.`})
        }
        interaction.reply(`${interaction.user.username}#${interaction.user.discriminator}, You successfully paid to ${user.user.username} \`${amount}\`$.`)
        db.add(`money_${interaction.guildId}_${user.id}`, amount)
        db.subtract(`money_${interaction.guildId}_${interaction.member.id}`, amount)
    
      const filter = (interaction) => interaction.user.id === interaction.member.id;
      }}
