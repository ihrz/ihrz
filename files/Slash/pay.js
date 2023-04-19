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
    name: 'pay',
    description: 'Give money to typed user',
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

        let user = interaction.options.getMember("member")
        let amount = interaction.options.getNumber("amount")
        let member = await db.get(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`)
        if (amount.toString().includes('-')) {
            return interaction.reply({ content: 'Negative money can not be paid.' })
        }
        if (member < amount.value) {
            return interaction.reply({ content: `That's more money than you've got in your balance. try again.` })
        }
        interaction.reply(`${interaction.user.username}#${interaction.user.discriminator}, You successfully paid to ${user.user.username} \`${amount}\`$.`)
        await db.add(`${interaction.guild.id}.USER.${user.id}.ECONOMY.money`, amount)
        await db.sub(`${interaction.guild.id}.USER.${interaction.member.id}.ECONOMY.money`, amount)

        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}
