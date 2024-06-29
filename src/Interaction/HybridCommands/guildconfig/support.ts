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
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    Message,
    Role,
    APIRole,
} from 'pwss';

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
                    value: "enable"
                },
                {
                    name: "Power Off",
                    value: "disable"
                }
            ]
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,
            description: 'The roles to give for our member',
            description_localizations: {
                "fr": "Les rôles à donner à vos membre"
            },

            required: false,
        },
        {
            name: 'input',
            type: ApplicationCommandOptionType.String,

            description: 'Choose the keywords wanted in the bio',
            description_localizations: {
                "fr": "Choisissez les mots-clés voulue dans la bio"
            },

            required: false,
        },
    ],
    thinking: false,
    category: 'guildconfig',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await interaction.reply({ content: data.support_not_admin });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString("action");
            var roles = interaction.options.getRole("roles");
            var input = interaction.options.getString("input");
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!); if (!_) return;
            var action = client.args.string(args!, 0)
            var roles = client.args.role(interaction, 0);
            var input = client.args.longString(args!, 2)
        };

        if (!roles) {
            await interaction.reply({ content: data.support_command_not_role });
            return;
        }
        if (action == "enable") {
            await client.db.set(`${interaction.guildId}.GUILD.SUPPORT`,
                {
                    input: input,
                    rolesId: roles.id,
                    state: action
                }
            );

            await interaction.reply({
                content: data.support_command_work
                    .replace("${interaction.guild.name}", interaction.guild.name)
                    .replace("${input}", input!)
                    .replace("${roles.id}", roles.id)
            });

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                    .setDescription(data.setjoinroles_logs_embed_description_on_enable
                        .replace("${interaction.user.id}", interaction.member.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };
        } else {
            await client.db.delete(`${interaction.guildId}.GUILD.SUPPORT`);

            await interaction.reply({
                content: data.support_command_work_on_disable
                    .replace("${interaction.guild.name}", interaction.guild.name)
            })

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setjoinroles_logs_embed_title_on_enable)
                    .setDescription(data.setjoinroles_logs_embed_description_on_enable
                        .replace("${interaction.user.id}", interaction.member.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };
            return;
        };
    },
};