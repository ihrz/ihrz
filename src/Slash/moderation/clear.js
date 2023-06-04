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

const {
    Client,
    Intents,
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'clear',
    description: 'Clear x number of message in a channels !',
    options: [
        {
            name: 'number',
            type: ApplicationCommandOptionType.Number,
            description: 'The number of message you want to delete !',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);
        
        const permission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
        var numberx = interaction.options.getNumber("number") + 1
        if (!permission) return interaction.reply({ content: data.clear_dont_have_permission });
        if (numberx > 98) { return interaction.reply({ content: data.clear_max_message_limit }) };

        interaction.channel.bulkDelete(numberx, true)
            .then((messages) => {
                interaction.channel
                    .send({
                        content: data.clear_channel_message_deleted
                            .replace(/\${messages\.size}/g, messages.size)
                    })
                    .then((sent) => {
                        setTimeout(() => {
                            sent.delete();
                        }, 3500);
                        interaction.reply({
                            content: data.clear_confirmation_message
                                .replace(/\${messages\.size}/g, messages.size)
                            , ephemeral: true
                        })
                    })
                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.clear_logs_embed_title)
                        .setDescription(data.clear_logs_embed_description
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                            .replace(/\${messages\.size}/g, messages.size)
                            .replace(/\${interaction\.channel\.id}/g, interaction.channel.id)
                        )
                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) };
                } catch (e) { logger.err(e) };
            });
    }
}
