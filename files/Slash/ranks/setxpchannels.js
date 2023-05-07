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
const yaml = require('js-yaml'), fs = require('fs');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);
const logger = require(`${process.cwd()}/files/core/logger`);

module.exports = {
    name: 'setxpchannels',
    description: 'Set message channel earned by xp level',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Remove the module (send xp message on the user's message channel)",
                    value: "off"
                },
                {
                    name: 'Power on the module (send xp message on a specific channel)',
                    value: "on"
                }
            ],
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'The specific channel for xp message !',
            required: false
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        let type = interaction.options.getString("action")
        let argsid = interaction.options.getChannel("channel")

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setxpchannels_not_admin });
        }
        if (type === "on") {
            if (!argsid) return interaction.reply({ content: data.setxpchannels_valid_channel_message })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_enable)
                    .setDescription(data.setxpchannels_logs_embed_description_enable.replace(/\${interaction\.user.id}/g, interaction.user.id)
                    .replace(/\${argsid}/g, argsid.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`)
                if (already === argsid.id) return interaction.reply({ content: data.setxpchannels_already_with_this_config })
                client.channels.cache.get(argsid.id).send({ content: data.setxpchannels_confirmation_message })
                await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`, argsid.id);

                return interaction.reply({ content: data.setxpchannels_command_work_enable.replace(/\${argsid}/g, argsid.id) });

            } catch (e) {
                interaction.reply({ content: data.setxpchannels_command_error_enable });
            }


        }
        if (type == "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setxpchannels_logs_embed_title_disable)
                    .setDescription(data.setxpchannels_logs_embed_description_disable.replace(/\${interaction\.user.id}/g, interaction.user.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };
            try {
                let already2 = await db.get(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`)
                if (already2 === "off") return interaction.reply(data.setxpchannels_already_disabled_disable)

                await db.delete(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`);
                return interaction.reply({content: data.setxpchannels_command_work_disable});

            } catch (e) {
                interaction.reply(data.setxpchannels_command_error_disable);
            }
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}



