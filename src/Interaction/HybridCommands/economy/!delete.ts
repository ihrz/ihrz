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
    EmbedBuilder,
    ChatInputCommandInteraction,
    Message,
    User,
    PermissionsBitField,
    Role,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generateRoleFields } from './economy.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var role = interaction.options.getRole("role") as Role;
        } else {
            var role = client.method.role(interaction, args!, 0) as Role;
        }

        var roleData = await client.db.get(`${interaction.guildId}.ECONOMY.buyableRoles`) as DatabaseStructure.EconomyModel["buyableRoles"];
        if (!roleData) {
            roleData = {};
        }

        if (Object.keys(roleData).length === 0) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_role_add_no_role
            });
            return;
        }

        delete roleData[role.id];

        await client.db.set(`${interaction.guildId}.ECONOMY.buyableRoles`, roleData);

        let embed = new EmbedBuilder()
            .setTitle(lang.economy_boost_embed_title)
            .setDescription(lang.economy_boost_embed_desc)
            .setFields(generateRoleFields(roleData, lang))
            .setColor("#0097ff")
            .setTimestamp()
            .setFooter(await client.method.bot.footerBuilder(interaction));

        await client.method.interactionSend(interaction, {
            embeds: [embed],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
    },
};