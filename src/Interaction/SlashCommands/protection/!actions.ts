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
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { rules } from './authorization.js';

import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (interaction.user.id !== interaction.guild?.ownerId) {
            await interaction.editReply({ content: lang.authorization_actions_not_permited });
            return;
        };

        let rule = interaction.options.getString('rule') as string;
        let allow = interaction.options.getString('allow') as string;

        if (rule === "all" && allow) {
            let allRules = Object.entries(rules).map(([key, value]) => (value.value));
            allRules.shift(); // Remove cls
            allRules.shift(); // Remove all

            for (let rule of allRules) {
                await client.db.set(`${interaction.guild.id}.PROTECTION.${rule}`, { mode: allow });
            }

            if (allow === 'member') allow = lang.authorization_actions_everyone;
            if (allow === 'allowlist') allow = lang.authorization_actions_allowlist;

            await interaction.editReply({
                content: lang.authorization_actions_rule_set
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${rule.toUpperCase()}', allRules.join(","))
                    .replace('${allow}', allow)
            });
            return;
        } else if (rule !== 'cls' && allow) {
            await client.db.set(`${interaction.guild.id}.PROTECTION.${rule}`, { mode: allow });

            if (allow === 'member') allow = lang.authorization_actions_everyone;
            if (allow === 'allowlist') allow = lang.authorization_actions_allowlist;

            await interaction.editReply({
                content: lang.authorization_actions_rule_set
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${rule.toUpperCase()}', rule.toUpperCase() as unknown as string)
                    .replace('${allow}', allow)
            });
            return;
        } else if (rule === 'cls') {
            await client.db.delete(`${interaction.guild.id}.PROTECTION`);

            await interaction.editReply({
                content: lang.authorization_actions_rule_clear
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${interaction.guild.name}', interaction.guild.name)
            });
            return;
        };

        return interaction.editReply({ content: lang.close_error_command });
    },
};