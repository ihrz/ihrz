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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let user = interaction.options.getUser("member") as User;
        let amount = interaction.options.getNumber("amount") as number;

        let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.addinvites_not_admin_embed_description);

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ embeds: [a] });
            return;
        };

        await client.db.add(`${interaction.guildId}.USER.${user?.id}.INVITES.invites`, amount!);

        let finalEmbed = new EmbedBuilder()
            .setDescription(data.addinvites_confirmation_embed_description
                .replace(/\${amount}/g, amount!.toString())
                .replace(/\${user}/g, user.toString())
            )
            .setColor(`#92A8D1`)
            .setFooter({ text: interaction.guild?.name as string, iconURL: interaction.guild?.iconURL() as string });

        await client.db.add(`${interaction.guildId}.USER.${user?.id}.INVITES.bonus`, amount!);
        await interaction.editReply({ embeds: [finalEmbed] });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.addinvites_logs_embed_title)
                .setDescription(data.addinvites_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${amount}/g, amount.toString())
                    .replace(/\${user\.id}/g, user.id)
                );

            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            };
        } catch {
            return;
        };
    },
};