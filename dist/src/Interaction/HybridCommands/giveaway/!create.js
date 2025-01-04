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
import { axios } from '../../../core/functions/axios.js';
async function isImageUrl(url) {
    try {
        const response = await axios.head(url);
        const contentType = response.headers.get("content-type");
        return contentType.startsWith("image/");
    }
    catch (error) {
        return false;
    }
}
;
export default {
    run: async (client, interaction, lang, command, neededPerm, args) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel)
            return;
        const permissionsArray = [PermissionsBitField.Flags.ManageMessages];
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);
        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { content: lang.start_not_perm });
            return;
        }
        ;
        var giveawayChannel = interaction.channel;
        if (interaction instanceof ChatInputCommandInteraction) {
            var giveawayRequirement = interaction.options.getString("requirement");
            var giveawayRequirementValue = interaction.options.getString("requirement-value");
            var giveawayDuration = interaction.options.getString("time");
            var giveawayNumberWinners = interaction.options.getNumber("winner");
            var imageUrl = interaction.options.getString('image');
            var giveawayPrize = interaction.options.getString("prize");
        }
        else {
            var giveawayNumberWinners = client.method.number(args, 0);
            var giveawayDuration = client.method.string(args, 1);
            var giveawayRequirement = client.method.string(args, 2);
            var giveawayPrize = client.method.string(args, 3);
            var giveawayRequirementValue = client.method.string(args, 4);
            var imageUrl = "";
        }
        ;
        if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners.toString()) <= 0)) {
            await client.method.interactionSend(interaction, { content: lang.start_is_not_valid });
            return;
        }
        ;
        let giveawayDurationFormated = client.timeCalculator.to_ms(giveawayDuration);
        if (!giveawayDurationFormated) {
            await client.method.interactionSend(interaction, {
                content: lang.start_time_not_valid
                    .replace('${interaction.user}', interaction.member.user.toString())
            });
            return;
        }
        ;
        if (giveawayRequirement === "invites" && !client.method.isNumber(giveawayRequirementValue || "")) {
            await client.method.interactionSend(interaction, {
                content: lang.start_invalid_invites_req_value
                    .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }
        else if (giveawayRequirement === 'messages' && !client.method.isNumber(giveawayRequirementValue || "")) {
            await client.method.interactionSend(interaction, {
                content: lang.start_invalid_messages_req_value
                    .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }
        else if (giveawayRequirement === "roles" && !interaction.guild.roles.cache.has(giveawayRequirementValue || "")) {
            await client.method.interactionSend(interaction, {
                content: lang.start_invalid_roles_req_value
                    .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        }
        await client.giveawaysManager.create(giveawayChannel, {
            duration: giveawayDurationFormated,
            prize: giveawayPrize,
            winnerCount: giveawayNumberWinners,
            hostedBy: interaction.member.user.id,
            embedImageURL: await isImageUrl(imageUrl) ? imageUrl : null,
            requirement: { type: giveawayRequirement, value: giveawayRequirementValue }
        });
        await client.method.iHorizonLogs.send(interaction, {
            title: lang.reroll_logs_embed_title,
            description: lang.start_logs_embed_description
                .replace('${interaction.user.id}', interaction.member.user.id)
                .replace(/\${giveawayChannel}/g, giveawayChannel.toString())
        });
        await client.method.interactionSend(interaction, {
            content: lang.start_confirmation_command
                .replace(/\${giveawayChannel}/g, giveawayChannel.toString())
        });
        return;
    },
};
