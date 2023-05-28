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

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'reroll',
    description: 'reroll a giveaways',
    options: [
        {
            name: 'giveaway-id',
            type: ApplicationCommandOptionType.String,
            description: 'The giveaway id (is the message id of the embed\'s giveaways)',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);

        const fuckingLifeOfTrees = interaction.options.getString("giveaway-id")
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: data.reroll_not_perm });
        }

        const giveaway =
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.prize === fuckingLifeOfTrees) ||
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.messageId === fuckingLifeOfTrees);
        if (!giveaway) {
            return interaction.reply({
                content: data.reroll_dont_find_giveaway
                    .replace("{args}", args.join(' '))
            });
        }

        client.giveawaysManager
            .reroll(giveaway.messageId)
            .then(() => {
                interaction.reply({ content: data.reroll_command_work });
                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.reroll_logs_embed_title)
                        .setDescription(data.reroll_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${giveaway\.messageID}/g, giveaway.messageID) 
                        )

                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e) { logger.err(e) };
            })
            .catch((error) => {
                logger.err(error)
                if (error.startsWith(`Giveaway with message Id ${giveaway.messageId} is not ended.`)) { interaction.reply({ content: `This giveaway is not over!` }); }
                else { interaction.reply({ content: data.reroll_command_error }); }
            });
    }
};
