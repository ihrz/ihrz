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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'massiverole',
    description: 'Add/Remove roles to everyone on the server',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
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
            description: 'The specified role you want to add!',
            required: true
        }
    ],
    category: 'utils',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let action = interaction.options.getString("action");
        let role = interaction.options.getRole("role");

        let a: number = 0;
        let s: number = 0;
        let e: number = 0;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.prevnames_not_admin });
            return;
        };

        if (interaction.guild.memberCount >= 1500) {
            await interaction.editReply({ content: data.massiverole_too_much_member });
            return;
        };

        if (action === 'add') {

            try {
                let members = await interaction.guild.members.fetch();
                let promises = [];

                for (let [memberID, member] of members) {
                    if (!member.roles.cache.has(role.id)) {
                        let promise = member.roles.add(role)
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
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setColor('#007fff')
                .setTimestamp()
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(data.massiverole_add_command_work
                    .replace('${interaction.user}', interaction.user)
                    .replace('${a}', a)
                    .replace('${s}', s)
                    .replace('${e}', e)
                    .replaceAll('${role}', role)
                );

            await interaction.editReply({ embeds: [embed] });
            return;
        } else if (action === 'sub') {

            try {
                let members = await interaction.guild.members.fetch();
                let promises = [];

                for (let [memberID, member] of members) {
                    if (member.roles.cache.has(role.id)) {
                        let promise = member.roles.remove(role)
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
                .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
                .setColor('#007fff')
                .setTimestamp()
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setDescription(data.massiverole_sub_command_work
                    .replace('${interaction.user}', interaction.user)
                    .replace('${a}', a)
                    .replace('${s}', s)
                    .replace('${e}', e)
                    .replaceAll('${role}', role)
                );

            await interaction.editReply({ embeds: [embed] });
            return;
        };

        return;
    },
};