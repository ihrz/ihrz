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

import {
    Client,
    EmbedBuilder,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let baseData = await client.db.get(`${interaction.guild.id}.ALLOWLIST`);

        if (interaction.user.id !== interaction.guild.ownerId && baseData.list[interaction.user.id]?.allowed !== true) {
            await interaction.editReply({ content: 'You are not authorized to use this command! You must be in the allowlist!' });
            return;
        };

        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.editReply({ content: 'Only the owner of the server can add/remove user in the allow-list!' });
            return;
        };

        let member = interaction.options.getMember('member');

        if (!member) {
            await interaction.editReply({ content: 'The member you wanted to remove into the allow-list is unreachable!' });
            return;
        };

        if (member === interaction.guild.ownerId) {
            await interaction.editReply({ content: 'This is not possible to delete the owner of the server from the allowlist!' });
            return;
        };

        if (!baseData.list[member.user.id]?.allowed == true) {
            await interaction.editReply({ content: "The member you want to remove from the allowlist isn't in it!" });
            return;
        };

        await client.db.delete(`${interaction.guild.id}.ALLOWLIST.list.${member.user.id}`);
        await interaction.editReply({ content: `<@${member.user.id}> has been removed from the allowlist !` });
        return;
    },
};