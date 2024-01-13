/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: "add-invites",

    description: "Add invites to a user!",
    description_localizations: {
        "fr": "Ajouter des invitations à un utilisateur"
    },

    thinking: false,
    category: 'invitemanager',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let user = interaction.mentions.members?.toJSON()[1] || interaction.author;
        let amount = args[1] || args[0];

        let a = new EmbedBuilder().setColor("#FF0000").setDescription(data.addinvites_not_admin_embed_description);

        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ embeds: [a] });
            return;
        };

        await client.db.add(`${interaction.guild?.id}.USER.${user?.id}.INVITES.invites`, amount!);

        let finalEmbed = new EmbedBuilder()
            .setDescription(data.addinvites_confirmation_embed_description
                .replace(/\${amount}/g, amount as unknown as string)
                .replace(/\${user}/g, user as unknown as string)
            )
            .setColor(`#92A8D1`)
            .setFooter({ text: interaction.guild?.name as string, iconURL: interaction.guild?.iconURL() as string });

        await client.db.add(`${interaction.guild?.id}.USER.${user?.id}.INVITES.bonus`, amount!);
        await interaction.reply({ embeds: [finalEmbed] });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.addinvites_logs_embed_title)
                .setDescription(data.addinvites_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.author.id)
                    .replace(/\${amount}/g, amount as unknown as string)
                    .replace(/\${user\.id}/g, user?.id as string)
                );

            let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
            };
        } catch (e: any) {
            return;
        };
    },
};