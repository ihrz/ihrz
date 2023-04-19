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

const config = require('../config.json');
const messages = require("../messages.js");

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


        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: `You must have permissions to manage messages to start the giveaways.` });
        }

        let giveawayChannel = interaction.options.getChannel("channel");
        if (!giveawayChannel) {
            return interaction.reply({ content: `You must mention a valid channel!` });
        }

        let giveawayDuration = interaction.options.getString("time");
        if (!giveawayDuration || isNaN(ms(giveawayDuration))) {
            returninteraction.reply({ content: `You must specify a valid duration!` });
        }

        let giveawayNumberWinners = interaction.options.getNumber("winner");
        if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners) <= 0)) {
            return interaction.reply({ content: `You must specify a valid number of winners!` });
        }

        let giveawayPrize = interaction.options.getString("prize");
        if (!giveawayPrize) {
            return interaction.reply({ content: `You must have a valid price!` });
        }
        client.giveawaysManager.start(giveawayChannel, {
            duration: ms(giveawayDuration),
            prize: giveawayPrize,
            winnerCount: parseInt(giveawayNumberWinners),
            hostedBy: config.hostedBy ? `<@${interaction.user.id}>` : null,
            messages
        });
        interaction.reply({ content: `Giveaway started in ${giveawayChannel}!` });

        try {
            logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle("Giveaway Logs")
                .setDescription(`<@${interaction.user.id}> started a giveways in: ${giveawayChannel}`)
            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { console.error(e) };

        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}
