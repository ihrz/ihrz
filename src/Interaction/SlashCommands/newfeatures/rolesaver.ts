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
    ApplicationCommandOptionType,
    CommandInteractionOptionResolver,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    PermissionsBitField,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';


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
            ],

            permission: null
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
            ],

            permission: null
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
    permission: PermissionFlagsBits.Administrator,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        var action = interaction.options.getString("action");
        var settings = interaction.options.getString("settings") || "None";
        var timeout = interaction.options.getString("timeout") || "None";

        if (action === 'on') {

            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle(lang.rolesaver_embed_title)
                .setDescription(lang.rolesaver_embed_desc)
                .addFields(
                    { name: lang.rolesaver_embed_fields_1_name, value: `\`${action}\``, inline: false },
                    { name: lang.rolesaver_embed_fields_2_name, value: `\`${settings}\``, inline: false },
                    { name: lang.rolesaver_embed_fields_3_name, value: `\`${timeout}\``, inline: false }
                )
                .setFooter(await client.func.displayBotName.footerBuilder(interaction));

            await interaction.reply({ embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)] });
            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.rolesaver`, {
                enable: true,
                timeout: timeout,
                admin: settings
            });

            return;
        } else if (action === 'off') {
            let state = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.rolesaver.enable`);

            if (!state) {
                await interaction.reply({ content: lang.rolesaver_on_off_already_set });
                return;
            };

            let embed = new EmbedBuilder()
                .setColor("#3725a4")
                .setTitle(lang.rolesaver_on_off_embed_title)
                .setDescription(lang.rolesaver_on_off_embed_desc)
                .addFields(
                    { name: lang.rolesaver_on_off_embed_fields_1_name, value: `\`${action}\``, inline: false },
                )
                .setFooter(await client.func.displayBotName.footerBuilder(interaction));

            await interaction.reply({
                embeds: [embed],
                files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
            });
            await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.rolesaver`);
            return;
        }
    },
};