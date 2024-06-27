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
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    time
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.end_not_admin });
            return;
        };

        let giveawayData = client.giveawaysManager.getAllGiveawayData();
        let filtered = giveawayData.filter((giveaway) => giveaway.giveawayData.guildId === interaction.guildId && !giveaway.giveawayData.ended);

        let embed = new EmbedBuilder()
            .setColor("#2986cc")
            .setTimestamp()
            .setTitle(data.gw_getall_embed_title
                .replace('${interaction.guild?.name}', interaction.guild.name as string)
            )
            .setAuthor(
                {
                    name: (interaction.guild.name as string),
                    iconURL: "attachment://icon.png"
                }
            )
            .setFooter(
                {
                    text: await client.func.displayBotName(interaction.guild.id),
                    iconURL: "attachment://icon_2.png",
                }
            );

        filtered.forEach(index => {
            let Channel = `<#${index.giveawayData.channelId}>`;
            let MessageURL = `https://discord.com/channels/${interaction.guildId}/${index.giveawayData.channelId}/${index.giveawayId}`;
            let ExpireIn = `${time(new Date(index.giveawayData.expireIn), 'd')}`;

            embed.addFields(
                {
                    name: `\`${index.giveawayId}\``,
                    value: data.gw_getall_embed_fields
                        .replace('${MessageURL}', MessageURL)
                        .replace('${ExpireIn}', ExpireIn)
                        .replace('${Channel}', Channel)
                }
            );
        });

        await interaction.editReply(
            {
                embeds: [embed],
                files: [
                    {
                        attachment: await client.func.image64(interaction.guild.iconURL({ size: 1024, forceStatic: false })),
                        name: 'icon.png'
                    },
                    {
                        attachment: await client.func.image64(client.user.displayAvatarURL({ size: 1024, forceStatic: false })),
                        name: 'icon_2.png'
                    }
                ],
            }
        );

        return;
    },
};