/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require(`${process.cwd()}/files/ihorizonjs`);

const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

slashInfo.economy.balance.run = async (client, interaction) => {
    let data = await getLanguageData(interaction.guild.id);
    const member = interaction.options.get('user');

    if (!member) {
        var bal = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money` });

        if (!bal) {
            return await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.USER.${interaction.user.id}.ECONOMY.money`, value: 1 }),
                interaction.reply({ content: data.balance_dont_have_wallet });
        }
        interaction.reply({
            content: data.balance_have_wallet
                .replace(/\${bal}/g, bal)
        });
    } else {
        if (member) {
            var bal = await DataBaseModel({ id: DataBaseModel.Get, key: `${interaction.guild.id}.USER.${member.value}.ECONOMY.money` });

            if (!bal) {
                return await DataBaseModel({ id: DataBaseModel.Set, key: `${interaction.guild.id}.USER.${member.value}.ECONOMY.money`, value: 1}),
                    interaction.reply({
                        content: data.balance_he_dont_have_wallet
                    });
            };
            return await interaction.reply({
                content: data.balance_he_have_wallet.replace(/\${bal}/g, bal)
            });
        }
    }
};

module.exports = slashInfo.economy.balance;