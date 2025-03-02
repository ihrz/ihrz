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
import wait from '../../../core/functions/wait.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        let unbanned_members = await client.db.get(`${interaction.guildId}.UTILS.unban_members`);
        let banned_members: string[] = [];
        let cannot_ban = 0;

        if (unbanned_members) {
            await Promise.all(unbanned_members.map(async (index: string) => {
                try {
                    await interaction.guild?.bans.create(index);
                    banned_members.push(index);
                } catch (e) {
                    cannot_ban++;
                }
                await wait(800);
            }));
        }

        await client.db.set(`${interaction.guildId}.UTILS.unban_members`, []);

        await client.func.method.interactionSend(interaction, {
            embeds: [
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(
                        lang.action_unban_undo_embed_desc
                            .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                            .replace('${banned_members.length}', banned_members.length.toString())
                            .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                            .replace('${cannot_ban}', cannot_ban.toString())
                    )
                    .setFooter(await client.func.displayBotName.footerBuilder(interaction))
            ],
            files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });

        return;
    },
};