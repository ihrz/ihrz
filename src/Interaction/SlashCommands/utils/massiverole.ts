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
    ChatInputCommandInteraction,
    Role,
    Guild,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'massiverole',

    description: 'Add/Remove roles to everyone on the server',
    description_localizations: {
        "fr": "Ajouter/Supprimer des rôles pour tout le monde sur le serveur"
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
                    name: "Add",
                    value: "add"
                },
                {
                    name: 'Remove',
                    value: "sub"
                }
            ],
        },
        {
            name: 'role',
            type: ApplicationCommandOptionType.Role,

            description: 'The specified role you want to add',
            description_localizations: {
                "fr": "Le rôle spécifié que vous souhaitez ajouter"
            },

            required: true
        }
    ],
    category: 'utils',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        let action = interaction.options.getString("action");
        let role = interaction.options.getRole("role");

        let a: number = 0;
        let s: number = 0;
        let e: number = 0;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.prevnames_not_admin });
            return;
        };

        if ((interaction.guild as Guild).memberCount >= 1500) {
            await interaction.editReply({ content: data.massiverole_too_much_member });
            return;
        };

        if (action === 'add') {

            try {
                let members = await interaction.guild?.members.fetch();
                let promises = [];

                for (let [memberID, member] of members!) {
                    if (!member.roles.cache.has(role?.id!)) {
                        let promise = member.roles.add(role as Role)
                            .then(() => {
                                a++;
                            })
                            .catch(() => {
                                e++;
                            });
                        promises.push(promise);
                    } else {
                        s++;
                    }
                };

                await Promise.all(promises);
            } catch (error) { };

            let embed = new EmbedBuilder()
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setColor('#007fff')
                .setTimestamp()
                .setThumbnail(interaction.guild?.iconURL() as string)
                .setDescription(data.massiverole_add_command_work
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${a}', a.toString())
                    .replace('${s}', s.toString())
                    .replace('${e}', e.toString())
                    .replaceAll('${role}', role?.toString()!)
                );

            await interaction.editReply({
                embeds: [embed],
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });
            return;
        } else if (action === 'sub') {

            try {
                let members = await interaction.guild?.members.fetch();
                let promises = [];

                for (let [memberID, member] of members!) {
                    if (member.roles.cache.has(role?.id!)) {
                        let promise = member.roles.remove(role as Role)
                            .then(() => {
                                a++;
                            })
                            .catch(() => {
                                e++;
                            });
                        promises.push(promise);
                    } else {
                        s++;
                    }
                };

                await Promise.all(promises);
            } catch (error) { };

            let embed = new EmbedBuilder()
                .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                .setColor('#007fff')
                .setTimestamp()
                .setThumbnail(interaction.guild?.iconURL() as string)
                .setDescription(data.massiverole_sub_command_work
                    .replace('${interaction.user}', interaction.user.toString())
                    .replace('${a}', a.toString())
                    .replace('${s}', s.toString())
                    .replace('${e}', e.toString())
                    .replaceAll('${role}', role?.toString()!)
                );

            await interaction.editReply({
                embeds: [embed],
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });
            return;
        };

        return;
    },
};