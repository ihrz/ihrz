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
import { ChatInputCommandInteraction, PermissionsBitField, } from 'discord.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel)
            return;
        const permissionsArray = [PermissionsBitField.Flags.ManageGuild];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { content: lang.reroll_not_perm });
            return;
        }
        ;
        if (interaction instanceof ChatInputCommandInteraction) {
            var inputData = interaction.options.getString("giveaway-id");
        }
        else {
            var inputData = client.method.string(args, 0);
        }
        ;
        if (!await client.giveawaysManager.isValid(inputData)) {
            await client.method.interactionSend(interaction, {
                content: lang.reroll_dont_find_giveaway
                    .replace("{args}", inputData)
            });
            return;
        }
        ;
        if (!await client.giveawaysManager.isEnded(inputData)) {
            await client.method.interactionSend(interaction, { content: lang.reroll_giveaway_not_over });
            return;
        }
        ;
        // @ts-ignore
        await client.giveawaysManager.reroll(client, inputData);
        await client.method.interactionSend(interaction, { content: lang.reroll_command_work });
        await client.method.iHorizonLogs.send(interaction, {
            title: lang.reroll_logs_embed_title,
            description: lang.reroll_logs_embed_description
                .replace(/\${interaction\.user\.id}/g, interaction.member.user.id)
                .replace(/\${giveaway\.messageID}/g, inputData)
        });
        return;
    },
};
