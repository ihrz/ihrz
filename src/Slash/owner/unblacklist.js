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
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

slashInfo.owner.unblacklist.run = async (client, interaction) => {
    const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
    let data = await getLanguageData(interaction.guild.id);

    const { QuickDB } = require("quick.db");
    const db = new QuickDB();

    if (await db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`) !== true) {
        return interaction.reply({ content: data.unblacklist_not_owner });
    }

    const member = interaction.options.getUser('member')
    let fetched = await db.get(`GLOBAL.BLACKLIST.${member.id}`)

    if (!fetched) { return interaction.reply({ content: data.unblacklist_not_blacklisted.replace(/\${member\.id}/g, member.id) }) }

    try {
        let bannedMember = await client.users.fetch(member.user.id)
        if (!bannedMember) { return interaction.reply({ content: data.unblacklist_user_is_not_exist }) }
        interaction.guild.members.unban(bannedMember)
        db.delete(`GLOBAL.BLACKLIST.${member.id}`);

        return interaction.reply({ content: data.unblacklist_command_work.replace(/\${member\.id}/g, member.id) })
    } catch (e) {
        db.delete(`GLOBAL.BLACKLIST.${member.id}`);
        return interaction.reply({ content: data.unblacklist_unblacklisted_but_can_unban_him })
    }
};

module.exports = slashInfo.owner.unblacklist