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
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'report',

    description: 'Report a bug, error, spell error to the iHorizon\'s dev!',
    description_localizations: {
        "fr": "Signaler un bug, une erreur, une faute d'orthographe au développeur d'iHorizon"
    },

    options: [
        {
            name: 'message-to-dev',
            type: ApplicationCommandOptionType.String,

            description: 'What is the problem? Please make a good sentences',
            description_localizations: {
                "fr": "Quelle est le problème? S'il vous plaît expliquer le problème."
            },

            required: true
        }
    ],
    thinking: true,
    category: 'newfeatures',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        var sentences = interaction.options.getString("message-to-dev")
        let timeout = 18000000
        let cooldown = await client.db.get(`${interaction.guildId}.USER.${interaction.user.id}.REPORT.cooldown`);

        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() - cooldown));

            await interaction.editReply({
                content: data.report_cooldown_command
                    .replace("${time}", time)
            });
            return;
        } else {
            if (interaction.guild.ownerId != interaction.user.id) {
                await interaction.editReply({ content: data.report_owner_need });
                return;
            };

            if (sentences && sentences.split(' ').length < 8) {
                await interaction.editReply({ content: data.report_specify });
                return;
            };

            interaction.editReply({ content: data.report_command_work });
            var embed = new EmbedBuilder()
                .setColor("#ff0000")
                .setDescription(`**${interaction.user.globalName || interaction.user.username}** (<@${interaction.user.id}>) reported:\n~~--------------------------------~~\n${sentences}\n~~--------------------------------~~\nServer ID: **${interaction.guild.id}**`)

            await (client.channels.cache.get(client.config.core.reportChannelID) as BaseGuildTextChannel).send({ embeds: [embed] });

            await client.db.set(`${interaction.guild.id}.USER.${interaction.user.id}.REPORT.cooldown`, Date.now());
            return;
        }
    },
};