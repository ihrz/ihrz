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
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

slashInfo.guildconfig.blockpub.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    let turn = interaction.options.getString("action")
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: data.blockpub_not_admin });
    }
    if (turn === "on") {
        // await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "on")
        await DataBaseModel({id: DataBaseModel.Set, key:`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, value: "on"})
        return interaction.reply({ content: data.blockpub_now_enable })
    }

    if (turn === "off") {
        // await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, "off")
        await DataBaseModel({id: DataBaseModel.Set, key:`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`, value: "off"})
        return interaction.reply({ content: data.blockpub_now_disable })
    }
};

module.exports = slashInfo.guildconfig.blockpub;