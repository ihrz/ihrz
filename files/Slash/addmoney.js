const Discord = require('discord.js')
const db = require('quick.db')

module.exports = {
  name: 'addmoney',
  description: 'add money to the bank of the typed user',
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

    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply("You cannot run this command because you do not have the necessary permissions `ADMINISTRATOR`")
  }
  var amount = interaction.options.get("amount")
  let user = interaction.options.get("member")
  interaction.reply({content: `Successfully added \`${amount.value}\`$ to <@${user.user.id}>`})
  db.add(`money_${interaction.guildId}_${user.user.id}`, amount.value)
  const filter = (interaction) => interaction.user.id === interaction.member.id;
return
    }}