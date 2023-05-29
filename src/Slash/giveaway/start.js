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
} = require('discord.js');

const config = require(`${process.cwd()}/files/config.js`);
const messages = require(`${process.cwd()}/src/messages.js`);

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'start',
    description: 'Start a giveaways',
    options: [
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'The channels where the giveaways is sent',
            required: true
        },
        {
            name: 'winner',
            type: ApplicationCommandOptionType.Number,
            description: 'Number of winner for the giveaways',
            required: true
        },
        {
            name: 'time',
            type: ApplicationCommandOptionType.String,
            description: 'The time duration of the giveaways',
            required: true
        },
        {
            name: 'prize',
            type: ApplicationCommandOptionType.String,
            description: 'The giveaway\'s prize',
            required: true
        }
    ],

    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: data.start_not_perm });
        }

        let giveawayChannel = interaction.options.getChannel("channel");

        let giveawayDuration = interaction.options.getString("time");

        let giveawayNumberWinners = interaction.options.getNumber("winner");

        if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners) <= 0)) {
            return interaction.reply({ content: data.start_is_not_valid });
        }

        let giveawayPrize = interaction.options.getString("prize");

        client.giveawaysManager.start(giveawayChannel, {
            duration: ms(giveawayDuration),
            prize: giveawayPrize,
            winnerCount: parseInt(giveawayNumberWinners),
            hostedBy: config.giveaway.hostedBy ? `<@${interaction.user.id}>` : null,
            messages
        });
        interaction.reply({ content: data.start_confirmation_command
            .replace(/\${giveawayChannel}/g, giveawayChannel)
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
    }
}
