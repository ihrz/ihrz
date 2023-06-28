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

const slashInfo = require(`${process.cwd()}/files/ihorizon-api/slashHandler`);

const ms = require('ms');
const {
    Client,
    Intents,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require(`${process.cwd()}/files/ihorizonjs`);

const config = require(`${process.cwd()}/files/config.js`);
const logger = require(`${process.cwd()}/src/core/logger`);

slashInfo.giveaway.start.run = async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: data.start_not_perm });
        };

        let giveawayChannel = interaction.options.getChannel("channel");

        let giveawayDuration = interaction.options.getString("time");

        let giveawayNumberWinners = interaction.options.getNumber("winner");

        if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners) <= 0)) {
            return interaction.reply({ content: data.start_is_not_valid });
        };

        let giveawayPrize = interaction.options.getString("prize");

        client.giveawaysManager.start(giveawayChannel, {
            duration: ms(giveawayDuration),
            prize: giveawayPrize,
            winnerCount: parseInt(giveawayNumberWinners),
            hostedBy: config.giveaway.hostedBy ? `<@${interaction.user.id}>` : null,
        });

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.reroll_logs_embed_title)
                .setDescription(data.start_logs_embed_description
                    .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    .replace(/\${giveawayChannel}/g, giveawayChannel) 
                );

            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { logger.err(e) };

        return await interaction.reply({ content: data.start_confirmation_command
            .replace(/\${giveawayChannel}/g, giveawayChannel)
        });
};

module.exports = slashInfo.giveaway.start;