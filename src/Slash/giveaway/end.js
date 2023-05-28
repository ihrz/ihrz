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
    name: 'end',
    description: 'force end a giveaways',
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
             return interaction.reply({ content: data.end_not_admin }); }

        const giveaway =
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.prize === fuckingLifeOfTrees) ||
            client.giveawaysManager.giveaways.find((g) => g.guildId === interaction.guild.id && g.messageId === fuckingLifeOfTrees);
        if (!giveaway) { return interaction.reply({ content: data.end_not_find_giveaway
            .replace(/\${gw}/g, fuckingLifeOfTrees) 
         }); };

        client.giveawaysManager
            .end(giveaway.messageId)
            .then(() => {
                interaction.reply({ content: data.end_confirmation_message
                    .replace(/\${timeEstimate}/g, client.giveawaysManager.options.updateCountdownEvery / 1000)                
                });

                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.end_logs_embed_title)
                        .setDescription(data.end_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${giveaway\.messageID}/g, giveaway.messageID)
                        )
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e) { logger.err(e) };
            })
            .catch((error) => {
                    return interaction.reply({ content: data.end_command_error });
            });
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}