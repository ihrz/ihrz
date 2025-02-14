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
    Client,
    PermissionsBitField,
    AutoModerationRuleTriggerType,
    ChatInputCommandInteraction,
    TextChannel
} from 'discord.js';

interface Action {
    type: number;
    metadata: Record<string, any>;
};

const regexPatterns = [
    '(discord\\.gg\\/|\\.gg\\/|gg\\/|https?:\\/\\/|http?:\\/\\/)',
    '(?:%[0-9a-fA-F]{2})+',
    '(?:<.*?>)?\\s*https?:\\/\\/.*?',
    '[dD][iI][sS][cC][oO][rR][dD]\\s*\\.\\s*[gG][gG]',
    '(?:%[0-9a-fA-F]{2}){2,}',
    '(?:https?:\/\/)?(?:%[0-9a-fA-F]{2})+(?:\.[a-zA-Z]{2,}|\/%[0-9a-fA-F]{2,})*'
];

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let turn = interaction.options.getString("action");
        let logs_channel = interaction.options.getChannel('logs-channel');

        let automodRules = await interaction.guild.autoModerationRules.fetch();
        let KeywordPresetRule = automodRules.find((rule: { triggerType: AutoModerationRuleTriggerType; }) => rule.triggerType === AutoModerationRuleTriggerType.Keyword);

        if (turn === "on") {

            if (!KeywordPresetRule) {
                let arrayActionsForRule: Action[] = [
                    {
                        type: 1,
                        metadata: {
                            customMessage: "This message was prevented by iHorizon"
                        }
                    },
                ];

                if (logs_channel) {
                    arrayActionsForRule.push({
                        type: 2,
                        metadata: {
                            channel: logs_channel,
                        }
                    });
                };

                await interaction.guild.autoModerationRules.create({
                    name: 'Block advertissement message by iHorizon',
                    enabled: true,
                    eventType: 1,
                    triggerType: 1,
                    triggerMetadata:
                    {
                        regexPatterns: regexPatterns.map(pattern => `/${pattern}/i`)
                    },
                    actions: arrayActionsForRule
                });
            } else if (KeywordPresetRule) {

                KeywordPresetRule.edit({
                    enabled: true,
                    triggerMetadata:
                    {
                        regexPatterns: regexPatterns.map(pattern => `/${pattern}/i`)
                    },
                    actions: [
                        {
                            type: 1,
                            metadata: {
                                customMessage: "This message was prevented by iHorizon"
                            }
                        },
                        {
                            type: 2,
                            metadata: {
                                channel: logs_channel as TextChannel
                            }
                        },
                    ]
                });
            };

            await interaction.editReply({
                content: lang.automod_block_link_command_on
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${logs_channel}', (logs_channel?.toString() || 'None'))
            });
            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.media`, false);

            return;
        } else if (turn === "off") {
            await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.media`);
            await KeywordPresetRule?.setEnabled(false);

            await interaction.editReply({
                content: lang.automod_block_link_command_off
                    .replace('${interaction.user}', interaction.user.toString())
            });

            return;
        };
    },
};