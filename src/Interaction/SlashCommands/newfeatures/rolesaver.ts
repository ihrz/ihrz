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
    Client,
    EmbedBuilder,
    ApplicationCommandOptionType,
    CommandInteractionOptionResolver,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    PermissionsBitField,
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'rolesaver',

    description: 'Re-Gave old roles when User re-join the guild!',
    description_localizations: {
        "fr": "Ré-attribuer les anciens rôles lorsque l'utilisateur rejoint le serveur"
    },

    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,

            description: 'Do you want to power On/Off the module ?',
            description_localizations: {
                "fr": "Voulez-vous activer/désactiver le module ?"
            },

            required: true,
            choices: [
                {
                    name: "Power On",
                    value: "on"
                },
                {
                    name: "Power Off",
                    value: "off"
                }
            ]
        },
        {
            name: 'settings',
            type: ApplicationCommandOptionType.String,

            description: 'Re-gave Administrator role ?',
            description_localizations: {
                "fr": "Redonner des rôles admin ?"
            },

            required: false,
            choices: [
                {
                    name: "Yes",
                    value: "yes"
                },
                {
                    name: "No",
                    value: "no"
                }
            ]
        },
        // {
        //     name: 'timeout',
        //     type: ApplicationCommandOptionType.String,
        //     description: 'When the roles-saver timeout ?',
        //     required: false,
        //     choices: [
        //         {
        //             name: "1 hour",
        //             value: "1h"
        //         },
        //         {
        //             name: "1 day",
        //             value: "1d"
        //         },
        //         {
        //             name: "1 week",
        //             value: "1w"
        //         },
        //     ]
        // },
    ],
    thinking: false,
    category: 'newfeatures',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        var action = interaction.options.getString("action");
        var settings = interaction.options.getString("settings") || "None";
        var timeout = interaction.options.getString("timeout") || "None";

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.punishpub_not_admin });
            return;
        };

        if (action === 'on') {
            let state = await client.db.get(`${interaction.guildId}.GUILD_CONFIG.rolesaver.enable`);

            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle(data.rolesaver_embed_title)
                .setDescription(data.rolesaver_embed_desc)
                .addFields(
                    { name: data.rolesaver_embed_fields_1_name, value: `\`${action}\``, inline: false },
                    { name: data.rolesaver_embed_fields_2_name, value: `\`${settings}\``, inline: false },
                    { name: data.rolesaver_embed_fields_3_name, value: `\`${timeout}\``, inline: false }
                )
                .setFooter({ text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png" });

            await interaction.reply({ embeds: [embed], files: [{ attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL()), name: 'icon.png' }] });
            await client.db.set(`${interaction.guildId}.GUILD_CONFIG.rolesaver.enable`, true);
            await client.db.set(`${interaction.guildId}.GUILD_CONFIG.rolesaver.timeout`, timeout);
            await client.db.set(`${interaction.guildId}.GUILD_CONFIG.rolesaver.admin`, settings);

            return;
        } else if (action === 'off') {
            let state = await client.db.get(`${interaction.guildId}.GUILD_CONFIG.rolesaver.enable`);

            if (!state) {
                await interaction.reply({ content: data.rolesaver_on_off_already_set });
                return;
            };

            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle(data.rolesaver_on_off_embed_title)
                .setDescription(data.rolesaver_on_off_embed_desc)
                .addFields(
                    { name: data.rolesaver_on_off_embed_fields_1_name, value: `\`${action}\``, inline: false },
                )
                .setFooter({ text: await client.func.displayBotName(interaction.guild.id), iconURL: "attachment://icon.png" });

            await interaction.reply({
                embeds: [embed],
                files: [{ attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL()), name: 'icon.png' }]
            });
            await client.db.delete(`${interaction.guildId}.GUILD_CONFIG.rolesaver`);
            return;
        }
    },
};