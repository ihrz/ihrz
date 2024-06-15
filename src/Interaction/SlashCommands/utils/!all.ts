/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import wait from '../../../core/functions/wait.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.prevnames_not_admin });
            return;
        };

        let banned_members = await interaction.guild?.bans.fetch()

        let unbanned_members: string[] = [];
        let cannot_unban = 0;

        if (!banned_members) {
            await interaction.editReply({ content: data.action_unban_all_no_banned_members });
            return;
        }

        await Promise.all(banned_members.map(async index => {
            try {
                await interaction.guild?.bans.remove(index.user.id);
                unbanned_members.push(index.user.id);
            } catch (e) {
                cannot_unban++;
            }
            await wait(800);
        }));

        await client.db.set(`${interaction.guildId}.UTILS.unban_members`, unbanned_members);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(2829617)
                    .setDescription(
                        data.action_unban_all_embed_desc
                            .replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
                            .replace("${unbanned_members.length}", unbanned_members.length.toString())
                            .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                            .replace('${cannot_unban}', cannot_unban.toString())
                    )
                    .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            ],
            files: [
                {
                    attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()),
                    name: 'icon.png'
                }
            ]
        });

        return;
    },
};
