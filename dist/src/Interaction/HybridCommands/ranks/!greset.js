/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/
import { ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField, } from 'discord.js';
import { promptYesOrNo } from '../../../core/functions/awaitingResponse.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel)
            return;
        let a = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(lang.removeinvites_not_admin_embed_description);
        const permissionsArray = [PermissionsBitField.Flags.Administrator];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { embeds: [a] });
            return;
        }
        ;
        let response = await promptYesOrNo(interaction, {
            content: lang.reset_uranks_are_you_sure,
            noButton: lang.resetallinvites_no_button,
            yesButton: lang.resetallinvites_yes_button,
            dangerAction: true
        });
        if (response) {
            let DbData = await client.db.get(`${interaction.guild?.id}.USER`);
            for (let entries in DbData) {
                await client.db.delete(`${interaction.guild?.id}.USER.${entries}.XP_LEVELING`);
            }
            await client.method.interactionSend(interaction, { content: lang.resetallinvites_succes_on_delete, components: [] });
            await client.method.iHorizonLogs.send(interaction, {
                title: lang.reset_uranks_logs_embed_title,
                description: lang.resetallinvites_logs_embed_desc
                    .replace("${interaction.member.user.toString()}", interaction.member.user.toString())
            });
        }
        else {
            await client.method.interactionSend(interaction, { content: lang.setjoinroles_action_canceled, components: [] });
        }
    },
};
