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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
    PermissionsBitField
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString('action');
        } else {

            var action = client.func.method.string(args!, 0);
        }

        if (action === 'on') {
            await client.db.set(`${interaction.guildId}.PFPS.disable`, false);
            await client.func.method.interactionSend(interaction, {
                content: lang.pfps_disable_command_action_on
                    .replace('${interaction.user}', interaction.member.user.toString())
            });

            return;
        } else if (action === 'off') {
            await client.db.set(`${interaction.guildId}.PFPS.disable`, true);
            await client.func.method.interactionSend(interaction, {
                content: lang.pfps_disable_command_action_off
                    .replace('${interaction.user}', interaction.member.user.toString())
            });

            return;
        }
    },
};