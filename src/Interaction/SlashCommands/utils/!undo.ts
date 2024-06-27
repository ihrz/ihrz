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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import wait from '../../../core/functions/wait.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.prevnames_not_admin });
            return;
        };

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

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(
                        data.action_unban_undo_embed_desc
                            .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                            .replace('${banned_members.length}', banned_members.length.toString())
                            .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                            .replace('${cannot_ban}', cannot_ban.toString())
                    )
                    .setFooter({ text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png" })
            ],
            files: [
                {
                    attachment: await interaction.client.func.image64(interaction.client.user?.displayAvatarURL()),
                    name: 'icon.png'
                }
            ]
        });

        return;
    },
};