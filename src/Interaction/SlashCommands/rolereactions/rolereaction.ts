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
    ApplicationCommandType
} from 'pwss'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'rolereaction',

    description: 'Set a roles when user react to a message with specific emoji',
    description_localizations: {
        "fr": "Définir des rôles lorsque l'utilisateur réagit à un message avec des emoji spécifiques"
    },

    options: [
        {
            name: "value",

            description: "Please make your choice.",
            description_localizations: {
                "fr": "Merci de faire votre choix"
            },

            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Add another",
                    value: "add"
                },
                {
                    name: "Remove one",
                    value: "remove"
                }
            ]
        },
        {
            name: 'messageid',
            type: ApplicationCommandOptionType.String,

            description: "Please copy the identifiant of the message you want to configure",
            description_localizations: {
                "fr": "Veuillez copier l'identifiant du message que vous souhaitez configurer"
            },

            required: true
        },
        {
            name: 'reaction',
            type: ApplicationCommandOptionType.String,

            description: `The emojis you want`,
            description_localizations: {
                "fr": "Les emojis que tu veux"
            },

            required: false
        },
        {
            name: 'role',
            type: ApplicationCommandOptionType.Role,

            description: 'The role you want to configure',
            description_localizations: {
                "fr": "Le rôle que vous souhaitez configurer"
            },

            required: false
        }
    ],
    category: 'rolereactions',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.reactionroles_dont_admin_added });
            return;
        };

        let type = interaction.options.getString("value");
        let messagei = interaction.options.getString("messageid");
        let reaction = interaction.options.getString("reaction");
        let role = interaction.options.getRole("role");

        let help_embed = new EmbedBuilder()
            .setColor("#0000FF")
            .setTitle("/reactionroles Help !")
            .setDescription(data.reactionroles_embed_message_description_added);

        if (type == "add") {
            if (!role) { await interaction.reply({ embeds: [help_embed] }) };
            if (!reaction) { return await interaction.reply({ content: data.reactionroles_missing_reaction_added }) };

            try {
                await interaction.channel.messages.fetch((messagei as string))?.then((message) => { message.react(reaction as string) });
            } catch {
                await interaction.reply({ content: data.reactionroles_dont_message_found });
                return;
            };

            let check = reaction.toString();

            if (check.includes("<") || check.includes(">") || check.includes(":")) {
                await interaction.reply({
                    content: data.reactionroles_invalid_emote_format_added.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                })
                return;
            };

            await client.db.set(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`,
                {
                    rolesID: role?.id, reactionNAME: reaction, enable: true
                }
            );

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.reactionroles_logs_embed_title_added)
                    .setDescription(data.reactionroles_logs_embed_description_added
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${messagei}", messagei!)
                        .replace("${reaction}", reaction)
                        .replace("${role}", role?.toString()!)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            await interaction.reply({
                content: data.reactionroles_command_work_added
                    .replace("${messagei}", messagei!)
                    .replace("${reaction}", reaction)
                    .replace("${role}", role?.toString()!)
                , ephemeral: true
            });
            return;
        } else if (type == "remove") {
            let reactionLet = interaction.options.getString("reaction");

            if (!reactionLet) {
                await interaction.reply({ content: data.reactionroles_missing_remove });
                return;
            };

            let message = await interaction.channel.messages.fetch(messagei as string).catch(async () => {
                await interaction.reply({ content: data.reactionroles_cant_fetched_reaction_remove })
                return;
            });

            let fetched = await client.db.get(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`);

            if (!fetched) {
                await interaction.reply({ content: data.reactionroles_missing_reaction_remove });
                return
            };

            let reactionVar = message?.reactions.cache.get(fetched.reactionNAME);

            if (!reactionVar) {
                await interaction.reply({ content: data.reactionroles_cant_fetched_reaction_remove })
                return;
            };
            await reactionVar.users.remove(client.user.id).catch((err: string) => { logger.err(err) });

            await client.db.delete(`${interaction.guildId}.GUILD.REACTION_ROLES.${messagei}.${reaction}`);

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.reactionroles_logs_embed_title_remove)
                    .setDescription(data.reactionroles_logs_embed_description_remove
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${messagei}", messagei!)
                        .replace("${reaction}", reaction!)
                    );
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            await interaction.reply({
                content: data.reactionroles_command_work_remove
                    .replace("${reaction}", reaction!)
                    .replace("${messagei}", messagei!)
                , ephemeral: true
            });
            return;
        };
    },
};