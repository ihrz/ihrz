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
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'punishpub',

    description: 'Punish user when he send too much advertisement!',
    description_localizations: {
        "fr": "Punir l'utilisateur lorsqu'il envoie trop de publicité"
    },

    options: [
        {
            name: 'status',
            type: ApplicationCommandOptionType.String,

            description: 'Choose the status of the module',
            description_localizations: {
                "fr": "Choisir l'état du module"
            },

            required: true,
            choices: [
                {
                    name: "ON",
                    value: "true"
                },
                {
                    name: "OFF",
                    value: "false"
                }
            ]
        },
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,

            description: 'The max amount of flags before punishement',
            description_localizations: {
                "fr": "Le nombre maximum de flags avant la punition"
            },

            required: false,
        },
        {
            name: 'punishement',
            type: ApplicationCommandOptionType.String,

            description: 'Choose the punishement',
            description_localizations: {
                "fr": "Choisir la punition"
            },

            required: false,
            choices: [
                {
                    name: "BAN",
                    value: "ban"
                },
                {
                    name: "KICK",
                    value: "kick"
                },
                {
                    name: "MUTE",
                    value: "mute"
                }
            ]
        }
    ],
    thinking: false,
    category: 'newfeatures',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.punishpub_not_admin });
            return;
        };

        let action = interaction.options.getString("status");
        let amount = interaction.options.getNumber("amount");
        let punishment = interaction.options.getString("punishement");

        if (amount && action == "true") {
            if (amount > 50) {
                await interaction.reply({ content: data.punishpub_too_hight_enable })
                return;
            };
            if (amount < 0) {
                await interaction.reply({ content: data.punishpub_negative_number_enable });
                return;
            };
            if (amount == 0) {
                await interaction.reply({ content: data.punishpub_zero_number_enable });
                return;
            };

            await client.db.set(`${interaction.guildId}.GUILD.PUNISH.PUNISH_PUB`,
                {
                    amountMax: amount - 1,
                    punishementType: punishment,
                    state: action
                }
            );

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.punishpub_logs_embed_title)
                    .setDescription(data.punishpub_logs_embed_description
                        .replace("${interaction.user.id}", interaction.user.id)
                        .replace("${amount}", amount.toString())
                        .replace("${punishement}", punishment?.toString()!)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e) { };

            await interaction.reply({
                content: data.punishpub_confirmation_message_enable
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${amount}", amount.toString())
                    .replace("${punishement}", punishment!)
            });
            return;
        } else {
            await client.db.delete(`${interaction.guildId}.GUILD.PUNISH.PUNISH_PUB`);
            await interaction.reply({ content: data.punishpub_confirmation_disable })

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.punishpub_logs_embed_title_disable)
                    .setDescription(data.punishpub_logs_embed_description_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e) { };

            return;
        };
    },
};