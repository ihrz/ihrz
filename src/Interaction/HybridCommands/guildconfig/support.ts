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
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    Message,
    Role,
    APIRole,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: 'support',

    description: 'Give a roles when guild\'s member have something about your server on them bio!',
    description_localizations: {
        "fr": "Donnez un rôle lorsque les membres de la guilde ont quelque chose sur votre serveur dans leur bio"
    },

    aliases: ["soutien"],

    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,

            description: 'Choose the action',
            description_localizations: {
                "fr": "Quelle action voulez-vous ?"
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
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: 'The roles to give for our member',
            description_localizations: {
                "fr": "Les rôles à donner à vos membre"
            },

            required: false,

            permission: null
        },
        {
            name: 'input',
            type: ApplicationCommandOptionType.String,

            description: 'Choose the keywords wanted in the bio',
            description_localizations: {
                "fr": "Choisissez les mots-clés voulue dans la bio"
            },

            required: false,

            permission: null
        },
    ],
    thinking: false,
    category: 'guildconfig',
    permission: PermissionsBitField.Flags.Administrator,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {        // Guard's Typing


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString("action");
            var roles = interaction.options.getRole("roles");
            var input = interaction.options.getString("input");
        } else {

            var action = client.func.method.string(args!, 0)
            var roles = client.func.method.role(interaction, args!, 1) as Role | null;
            var input = client.func.method.longString(args!, 2)
        };

        if (action == "on") {
            if (!roles) {
                await client.func.method.interactionSend(interaction, { content: lang.support_command_not_role });
                return;
            }

            await client.db.set(`${interaction.guildId}.GUILD.SUPPORT`,
                {
                    input: input,
                    rolesId: roles.id,
                    state: action
                }
            );

            await client.func.method.interactionSend(interaction, {
                content: lang.support_command_work
                    .replace("${interaction.guild.name}", interaction.guild.name)
                    .replace("${input}", input!)
                    .replace("${roles.id}", roles.id)
            });
        } else {
            await client.db.delete(`${interaction.guildId}.GUILD.SUPPORT`);

            await client.func.method.interactionSend(interaction, {
                content: lang.support_command_work_on_disable
                    .replace("${interaction.guild.name}", interaction.guild.name)
            })
            return;
        };
    },
};