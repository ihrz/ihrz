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

const { QuickDB } = require("quick.db");
const db = new QuickDB();
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = {
    name: 'balance',
    description: 'shows how much money you have in your bank',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'Target a user for see their current balance or keep blank for yourself',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let data = await getLanguageData(interaction.guild.id);
        const member = interaction.options.get('user');

        if (!member) {
            var bal = await db.get(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`);
            if (!bal) {
                return await db.set(`${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, 1),
                    interaction.reply({ content: data.balance_dont_have_wallet })
            }
            interaction.reply({
                content: data.balance_have_wallet
                    .replace(/\${bal}/g, bal)
            });
        } else {
            if (member) {
                var bal = await db.get(`${interaction.guild.id}.USER.${member.value}.ECONOMY.money`);
                if (!bal) {
                    return db.set(`${interaction.guild.id}.USER.${member.value}.ECONOMY.money`, 1),
                        interaction.reply({
                            content: data.balance_he_dont_have_wallet
                        })

                }
                interaction.reply({
                    content: data.balance_he_have_wallet.replace(/\${bal}/g, bal)
                });
            }
        }
    }
}
