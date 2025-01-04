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
import { PermissionsBitField, ChatInputCommandInteraction, } from 'discord.js';
import { generatePassword } from '../../../core/functions/random.js';
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel)
            return;
        ;
        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member");
            var reason = interaction.options.getString("reason");
        }
        else {
            var member = client.method.member(interaction, args, 0);
            var reason = client.method.longString(args, 1);
        }
        ;
        const permissionsArray = [PermissionsBitField.Flags.ModerateMembers];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, {
                content: lang.warn_dont_have_permission.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
            ;
        }
        ;
        let warnId = generatePassword({ length: 8, lowercase: true, numbers: true });
        await client.method.warnMember(interaction.member, member, reason).catch(() => { });
        await client.method.interactionSend(interaction, {
            content: lang.warn_command_work
                .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                .replace("${member?.toString()}", member?.toString())
                .replace("${reason}", reason)
                .replace("${warnId}", warnId)
        });
        await client.method.iHorizonLogs.send(interaction, {
            title: lang.warn_logEmbed_title,
            description: lang.warn_logEmbed_desc
                .replace("${interaction.member.toString()}", interaction.member.toString())
                .replace("${member?.toString()}", member?.toString())
                .replace("${reason}", reason)
        });
    },
};
