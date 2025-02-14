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
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../../types/command.js';
import { Option } from '../../../../../types/option.js';

export const command: Command = {
    name: "perm",

    description: "Subcommand for command permission!",
    description_localizations: {
        "fr": "Commande sous-groupé pour les permission de commande"
    },

    options: [
        {
            name: 'set-user',

            description: 'Set permission to user',
            description_localizations: {
                "fr": "Définir une permission à un utilisateur"
            },


            options: [
                {
                    name: "user",

                    description: "Member you want",
                    description_localizations: {
                        "fr": "Le membre que vous souhaiter modifier la permission"
                    },

                    type: ApplicationCommandOptionType.User,
                    required: true,

                    permission: null
                },
                {
                    name: "permission",

                    description: "permission you want to set for the member",
                    description_localizations: {
                        "fr": "La permission que vous souhaiter modifier au membre"
                    },

                    choices: [
                        {
                            name: "Default",
                            value: "0"
                        },
                        {
                            name: "Perm 1",
                            value: "1"
                        },
                        {
                            name: "Perm 2",
                            value: "2"
                        },
                        {
                            name: "Perm 3",
                            value: "3"
                        },
                        {
                            name: "Perm 4",
                            value: "4"
                        },
                        {
                            name: "Perm 5",
                            value: "5"
                        },
                        {
                            name: "Perm 6",
                            value: "6"
                        },
                        {
                            name: "Perm 7",
                            value: "7"
                        },
                        {
                            name: "Perm 8",
                            value: "8"
                        }
                    ],

                    type: ApplicationCommandOptionType.String,
                    required: true,

                    permission: null
                }
            ],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'command',

            description: 'Set a specific permission to use one command',
            description_localizations: {
                "fr": "Définir une permission spécifique pour l'utilisation d'une commande"
            },

            options: [
                {
                    name: 'action',
                    type: ApplicationCommandOptionType.String,

                    description: 'What you want to do?',
                    description_localizations: {
                        "fr": "Que veux-tu faire?"
                    },

                    required: true,
                    choices: [
                        {
                            name: 'Change commands permission',
                            value: "change"
                        },
                        {
                            name: "List all commands permission set",
                            value: "list"
                        }
                    ],
                    
                    permission: null
                },
                {
                    name: "command",

                    description: "The command you want to update",
                    description_localizations: {
                        "fr": "La commande que vous souhaiter modifier"
                    },

                    autocomplete: true,
                    type: ApplicationCommandOptionType.String,
                    required: false,

                    permission: null
                },
                {
                    name: "permission",

                    description: "The permission for the selected command",
                    description_localizations: {
                        "fr": "La permission pour la commande choisie"
                    },

                    choices: [
                        {
                            name: "Default",
                            value: "0"
                        },
                        {
                            name: "Perm 1",
                            value: "1"
                        },
                        {
                            name: "Perm 2",
                            value: "2"
                        },
                        {
                            name: "Perm 3",
                            value: "3"
                        },
                        {
                            name: "Perm 4",
                            value: "4"
                        },
                        {
                            name: "Perm 5",
                            value: "5"
                        },
                        {
                            name: "Perm 6",
                            value: "6"
                        },
                        {
                            name: "Perm 7",
                            value: "7"
                        },
                        {
                            name: "Perm 8",
                            value: "8"
                        }
                    ],

                    type: ApplicationCommandOptionType.String,
                    required: false,

                    permission: null
                },
                {
                    name: "custom-role",

                    description: "The custom role you want to set for the command",
                    description_localizations: {
                        "fr": "Le role personnalisé que vous souhaiter définir pour la commande"
                    },

                    type: ApplicationCommandOptionType.Role,

                    required: false,

                    permission: null
                },
                {
                    name: "custom-user",

                    description: "The custom user you want to set for the command",
                    description_localizations: {
                        "fr": "L'utilisateur personnalisé que vous souhaiter définir pour la commande"
                    },

                    type: ApplicationCommandOptionType.User,

                    required: false,

                    permission: null
                }
            ],

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'perm-list',

            description: 'show all granted user in the guild',
            description_localizations: {
                "fr": "Afficher toute les permission d'utilisateur du serveur"
            },

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
        {
            name: 'create-roles',

            description: 'Create roles for the permission',
            description_localizations: {
                "fr": "Créer les roles pour les permissions"
            },

            type: ApplicationCommandOptionType.Subcommand,

            permission: PermissionFlagsBits.Administrator
        },
    ],

    async autocomplete(client, interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices: string[] = [];

        if (focusedOption.name === 'command') {
            const getCommandChoices = (command: Command | Option, parentName = '') => {
                const commandName = parentName ? `${parentName} ${command.name}` : command.name;
                choices.push(commandName);

                if (command.options) {
                    command.options.forEach((option) => {
                        if (option.type === ApplicationCommandOptionType.SubcommandGroup || option.type === ApplicationCommandOptionType.Subcommand) {
                            getCommandChoices(option, commandName);
                        }
                    });
                }
            };

            client.commands.forEach((command: Command) => {
                getCommandChoices(command);
            });
        }

        const filtered = choices.filter(choice =>
            choice.includes(focusedOption.value) || choice.startsWith(focusedOption.value)
        ).slice(0, 25);

        await interaction.respond(
            filtered.map(choice => ({
                name: choice,
                value: choice
            })),
        );
    },


    thinking: true,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,

    permission: null
};