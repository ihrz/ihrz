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
    PermissionsBitField,
    AutoModerationRuleTriggerType,
    ChatInputCommandInteraction,
    TextChannel
} from 'pwss';

interface Action {
    type: number;
    metadata: Record<string, any>;
};
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let turn = interaction.options.getString("action");
        let logs_channel = interaction.options.getChannel('logs-channel');

        let automodRules = await interaction.guild.autoModerationRules.fetch();
        let KeywordPresetRule = automodRules.find((rule: { triggerType: AutoModerationRuleTriggerType; }) => rule.triggerType === AutoModerationRuleTriggerType.Keyword);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.blockpub_not_admin });
            return;

        } else if (turn === "on") {

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
                        regexPatterns: [
                            '(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]',
                        ]
                    },
                    actions: arrayActionsForRule
                });
            } else if (KeywordPresetRule) {

                KeywordPresetRule.edit({
                    enabled: true,
                    triggerMetadata:
                    {
                        regexPatterns: [
                            '/(discord\.gg\/|\.gg\/|gg\/|https:\/\/|http:\/\/)/i',
                            '\bhttps?:\/\/\S+\b',
                            '\b(https?:\/\/)?\S+\.\S+\b'
                        ]
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

            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.antipub`, "on");
            await interaction.editReply({
                content: data.automod_block_pub_command_on
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${logs_channel}', (logs_channel?.toString() || 'None'))
            });

            return;
        } else if (turn === "off") {
            await KeywordPresetRule?.setEnabled(false);

            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.antipub`, "off");
            await interaction.editReply({
                content: data.automod_block_pub_command_off
                    .replace('${interaction.user}', interaction.user.toString())
            });

            return;
        };
    },
};