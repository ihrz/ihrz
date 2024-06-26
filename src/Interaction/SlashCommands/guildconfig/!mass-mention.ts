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
    ChatInputCommandInteraction
} from 'pwss';

interface Action {
    type: number;
    metadata: Record<string, any>;
};
import { LanguageData } from '../../../../types/languageData';
import logger from '../../../core/logger.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let turn = interaction.options.getString("action");
        let max_mention = interaction.options.getNumber('max-mention-allowed') || 3;
        let logs_channel = interaction.options.getChannel('logs-channel');

        let automodRules = await interaction.guild.autoModerationRules.fetch();

        let mentionSpamRule = automodRules.find((rule: { triggerType: AutoModerationRuleTriggerType; }) => rule.triggerType === AutoModerationRuleTriggerType.MentionSpam);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.blockpub_not_admin });
            return;

        } else if (turn === "on") {

            try {

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

                if (!mentionSpamRule) {

                    await interaction.guild.autoModerationRules.create({
                        name: 'Block mass-mention spam by iHorizon',
                        enabled: true,
                        eventType: 1,
                        triggerType: 5,
                        triggerMetadata:
                        {
                            mentionTotalLimit: max_mention,
                            presets: [1, 2, 3]
                        },
                        actions: arrayActionsForRule
                    });
                } else if (mentionSpamRule) {
                    await mentionSpamRule.edit({
                        triggerMetadata:
                        {
                            mentionTotalLimit: max_mention,
                            presets: [1, 2, 3]
                        },
                        actions: arrayActionsForRule
                    });
                };

                await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.mass_mention`, "on");
                await interaction.editReply({
                    content: data.automod_block_massmention_command_on
                        .replace('${interaction.user}', interaction.user.toString())
                        .replace('${logs_channel}', (logs_channel?.toString() || 'None'))
                        .replace('${max_mention}', max_mention.toString())
                });
                return;
            } catch (error) {
                logger.err(error as any);
                await interaction.editReply({ content: 'Error 404' });
            }
        } else if (turn === "off") {

            await mentionSpamRule?.setEnabled(false);

            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.mass_mention`, "off");
            await interaction.editReply({
                content: data.automod_block_massmention_command_off
                    .replace('${interaction.user}', interaction.user.toString())
            });
            return;
        };
    },
};