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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {

    name: 'prevnames',

    description: 'Lookup an Discord User, and see this previous username !',
    description_localizations: {
        "fr": "Recherchez un utilisateur Discord et voyez ces noms d'utilisateur précédent"
    },

    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,

            description: "L'utilisateur que vous voulez rechercher",
            description_localizations: {
                "fr": "user you want to see this previous username"
            },

            required: false
        },
    ],
    thinking: false,
    category: 'utils',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id) as LanguageData;
        let user = interaction.options.getUser("user") || interaction.user;

        // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        //     await interaction.reply({ content: data.prevnames_not_admin });
        //     return;
        // };
        var char: Array<string> = await client.db.get(`DB.PREVNAMES.${user.id}`) || [];

        if (char.length == 0) {
            await interaction.reply({ content: `${data.prevnames_undetected}` });
            return;
        };

        let currentPage = 0;
        let usersPerPage = 5;
        let pages: { title: string; description: string; }[] = [];

        for (let i = 0; i < char.length; i += usersPerPage) {
            let pageUsers = char.slice(i, i + usersPerPage);
            let pageContent = pageUsers.map((userId) => userId).join('\n');
            pages.push({
                title: `${data.prevnames_embed_title.replace("${user.username}", user.globalName as string)} | Page ${i / usersPerPage + 1}`,
                description: pageContent,
            });
        };

        let createEmbed = () => {
            return new EmbedBuilder()
                .setColor("#000000")
                .setTitle(pages[currentPage].title)
                .setDescription(pages[currentPage].description)
                .setFooter({ text: `iHorizon | Page ${currentPage + 1}/${pages.length}`, iconURL: "attachment://icon.png" })
                .setTimestamp()
        };

        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('previousPage')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nextPage')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("trash-prevnames-embed")
                .setLabel("🗑️")
                .setStyle(ButtonStyle.Danger)
        );

        let messageEmbed = await interaction.reply({
            embeds: [createEmbed()],
            components: [(row as ActionRowBuilder<ButtonBuilder>)],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        let collector = messageEmbed.createMessageComponentCollector({
            filter: (i) => {
                i.deferUpdate();
                return interaction.user.id === i.user.id;
            }, time: 60000
        });

        collector.on('collect', async (interaction_2: { customId: string; }) => {
            if (interaction_2.customId === 'previousPage') {
                currentPage = (currentPage - 1 + pages.length) % pages.length;
            } else if (interaction_2.customId === 'nextPage') {
                currentPage = (currentPage + 1) % pages.length;
            } else if (interaction_2.customId === 'trash-prevnames-embed') {
                if (interaction.user.id === user.id) {
                    await client.db.delete(`DB.PREVNAMES.${user.id}`);
                    messageEmbed.edit({ embeds: [], components: [], content: data.prevnames_data_erased })
                    return;
                }
            }

            messageEmbed.edit({ embeds: [createEmbed()] });
        });

        collector.on('end', () => {
            row.components.forEach((component) => {
                if (component instanceof ButtonBuilder) {
                    component.setDisabled(true);
                }
            });
            messageEmbed.edit({ components: [(row as ActionRowBuilder<ButtonBuilder>)] });
        });

        return;
    },
};