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
    ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'punishpub',
    description: 'Punish user when he send too much advertisement!',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the action',
            required: true,
            choices: [
                {
                    name: "POWER ON",
                    value: "true"
                },
                {
                    name: "POWER OFF",
                    value: "false"
                }
            ]
        },
        {
            name: 'amount',
            type: ApplicationCommandOptionType.Number,
            description: 'The max amount of flags before punishement',
            required: false,
        },
        {
            name: 'punishement',
            type: ApplicationCommandOptionType.String,
            description: 'Choose the punishement',
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
    category: 'newfeatures',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.punishpub_not_admin });
            return;
        };

        let action = interaction.options.getString("action");
        let amount = interaction.options.getNumber("amount");
        let punishment = interaction.options.getString("punishement");

        if (action == "true") {
            if (amount > 50) {
                await interaction.editReply({ content: data.punishpub_too_hight_enable })
                return;
            };
            if (amount < 0) {
                await interaction.editReply({ content: data.punishpub_negative_number_enable });
                return;
            };
            if (amount == 0) {
                await interaction.editReply({ content: data.punishpub_zero_number_enable });
                return;
            };

            await client.db.set(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`,
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
                        .replace("${amount}", amount)
                        .replace("${punishement}", punishment)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { };

            await interaction.editReply({
                content: data.punishpub_confirmation_message_enable
                    .replace("${interaction.user.id}", interaction.user.id)
                    .replace("${amount}", amount)
                    .replace("${punishement}", punishment)
            });
            return;
        } else {
            await client.db.delete(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`);
            await interaction.editReply({ content: data.punishpub_confirmation_disable })

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.punishpub_logs_embed_title_disable)
                    .setDescription(data.punishpub_logs_embed_description_disable
                        .replace("${interaction.user.id}", interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
            } catch (e) { };

            return;
        };
    },
};