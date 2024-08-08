/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Message
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'embed-color',

    description: 'Set the embed color !',
    description_localizations: {
        "fr": "Changer les couleurs dans les embed de votre bot"
    },

    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,

            description: `What do you want to do ?`,
            description_localizations: {
                "fr": "Quelle sont les embed concerné ?"
            },

            required: true,
            choices: [
                {
                    name: 'Reset All Settings',
                    value: 'reset'
                },
                {
                    name: 'Set for iHorizon-Logs (#ihorizon-logs) Embed!',
                    value: 'ihrz-logs'
                },
                {
                    name: 'Set for Owner Module Embed!',
                    value: 'owner'
                },
                {
                    name: 'Set for Giveaway Embed!',
                    value: 'gw'
                },
                {
                    name: 'Set for Economy Embed!',
                    value: 'economy'
                },
                {
                    name: 'Set for Audits-Logs Embed!',
                    value: 'audits-logs'
                },
                {
                    name: 'Set for Fun Command Embed!',
                    value: 'fun-cmd'
                },
                {
                    name: 'Set for Utils Command Embed!',
                    value: 'utils-cmd'
                },
                {
                    name: 'Set for Mod Command Embed!',
                    value: 'mod-cmd'
                },
                {
                    name: 'Set for Music Command Embed!',
                    value: 'music-cmd'
                },
                {
                    name: 'All others Embed!',
                    value: 'all'
                },
            ]
        },
        {
            name: 'hex-color',
            type: ApplicationCommandOptionType.String,

            description: `Use www.color-hex.com`,
            description_localizations: {
                "fr": "Veuillez utilisé www.color-hex.com"
            },

            required: false
        },
    ],
    category: 'owner',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: any, execTimestamp?: number, args?: string[]) => {        // Guard's Typing
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const permissionsArray = [PermissionsBitField.Flags.ManageMessages]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.method.interactionSend(interaction, { content: lang.setjoindm_not_admin });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var choices = interaction.options.getString("action");
            var hex_color = interaction.options.getString("hex-color");
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var choices = client.method.string(args!, 0);
            var hex_color = client.method.string(args!, 1);
        };

        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        if (choices === 'reset') {
            await client.db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.all`);

            await client.method.interactionSend(interaction, {
                content: `${interaction.member.user.toString()}, now the color of all embeds are deleted!`
            });

            return;
        };

        if (hex_color && reg.test(hex_color)) {

            await client.db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.embed_color.${choices}`, hex_color);

            await client.method.interactionSend(interaction, {
                content: `${interaction.member.user.toString()}, now the embed color is \`${hex_color}\` for ${choices} !`
            });

            return;
        } else {
            await client.method.interactionSend(interaction, { content: `${interaction.member.user.toString()}, color is not in the right format.\nPlease refer to **www.color-hex.com**` });
            return;
        };
    },
};