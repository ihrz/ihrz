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

const { QuickDB } = require("quick.db");
const db = new QuickDB();
const logger = require(`${process.cwd()}/src/core/logger`);

module.exports = {
    name: 'disableticket',
    description: 'Disable ticket category on a guild',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Remove the module",
                    value: "off"
                },
                {
                    name: 'Power on the module',
                    value: "on"
                },
            ],
        },
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply(data.disableticket_not_admin);
        }

        let type = interaction.options.getString('action')

        if (type === "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disableticket_logs_embed_title_disable)
                    .setDescription(data.disableticket_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id));

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            await db.set(`${interaction.guild.id}.GUILD.TICKET.on_or_off`, "off");
            return interaction.reply(data.disableticket_command_work_disable);
        }
        if (type === "on") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disableticket_logs_embed_title_enable)
                    .setDescription(data.disableticket_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id));

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            await db.delete(`${interaction.guild.id}.GUILD.TICKET.on_or_off`);
            return interaction.reply({content: data.disableticket_command_work_enable});

        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}
