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
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel)
            return;
        const permissionsArray = [PermissionsBitField.Flags.ManageMessages];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, {
                content: lang.clear_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }
        ;
        if (interaction instanceof ChatInputCommandInteraction) {
            var numberx = interaction.options.getNumber("number");
        }
        else {
            var numberx = client.method.number(args, 0);
        }
        ;
        if (numberx && numberx > 100) {
            await client.method.interactionSend(interaction, {
                content: lang.clear_max_message_limit.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }
        ;
        interaction.channel.bulkDelete(numberx, true)
            .then(async (messages) => {
            client.method.channelSend(interaction, {
                content: lang.clear_confirmation_message
                    .replace(/\${messages\.size}/g, messages.size.toString())
            });
            await client.method.iHorizonLogs.send(interaction, {
                title: lang.clear_logs_embed_title,
                description: lang.clear_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.member?.user.id)
                    .replace(/\${messages\.size}/g, messages.size.toString())
                    .replace(/\${interaction\.channel\.id}/g, interaction.channel?.id)
            });
        });
    },
};
