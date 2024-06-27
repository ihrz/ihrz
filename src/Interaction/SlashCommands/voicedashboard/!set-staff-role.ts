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

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.editReply({
                content: data.tempvoice_staff_not_admin
                    .replace("${interaction.user.id}", interaction.user.id)
            });
            return;
        };

        let targetedRole = interaction.options.getRole('role');

        let embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(
                data.tempvoice_staff_desc_embed
                    .replace('${targetedRole?.id}', targetedRole?.id as string)
            )
            .setFooter({
                text: await client.func.displayBotName(interaction.guild.id),
                iconURL: client.user.displayAvatarURL({ size: 1024 })
            });

        await interaction.editReply({
            embeds: [embed]
        });

        await client.db.set(`${interaction.guildId}.VOICE_INTERFACE.staff_role`, targetedRole?.id);
    },
};