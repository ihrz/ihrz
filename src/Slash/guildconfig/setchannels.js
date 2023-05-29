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
    name: 'setchannels',
    description: 'Set a message channels for when a user join and leave',
    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: '<On join/On leave/Delete all settings>',
            required: true,
            choices: [
                {
                    name: "On join",
                    value: "join"
                },
                {
                    name: "On leave",
                    value: "leave"
                },
                {
                    name: "Delete all settings",
                    value: "off"
                }
            ]
        },
        {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: "The channel you wan't your welcome/goodbye message !",
            required: false
        }
    ],
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.setchannels_not_admin });
        }

        let type = interaction.options.getString("type")
        let argsid = interaction.options.getChannel("channel")

        if (type === "join") {
            if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_join)
                    .setDescription(data.setchannels_logs_embed_description_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
                if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_join })
                client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_join })
                await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`, argsid.id);

                return interaction.reply({
                    content: data.setchannels_command_work_on_join
                        .replace(/\${argsid\.id}/g, argsid.id)
                });
            } catch (e) {
                interaction.reply({ content: data.setchannels_command_error_on_join });
            }
        }

        if (type === "leave") {
            try {
                if (!argsid) return interaction.reply({ content: data.setchannels_not_specified_args })
                let already = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
                if (already === argsid.id) return interaction.reply({ content: data.setchannels_already_this_channel_on_leave })
                client.channels.cache.get(argsid.id).send({ content: data.setchannels_confirmation_message_on_leave })
                await db.set(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`, argsid.id);

                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setchannels_logs_embed_title_on_leave)
                        .setDescription(data.setchannels_logs_embed_description_on_leave
                            .replace(/\${argsid\.id}/g, argsid.id)
                            .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        )

                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e) { logger.err(e) };

                return interaction.reply({
                    content: data.setchannels_command_work_on_leave
                        .replace(/\${argsid\.id}/g, argsid.id)
                });

            } catch (e) {
                interaction.reply({ content: data.setchannels_command_error_on_leave });
            }
        }
        if (type === "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setchannels_logs_embed_title_on_off)
                    .setDescription(data.setchannels_logs_embed_description_on_off
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { logger.err(e) };

            let leavec = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
            let joinc = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
            if (joinc === "off" & leavec === "off") return interaction.reply({ content: data.setchannels_already_on_off })

            await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`);
            await db.delete(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`);
            return interaction.reply({ content: data.setchannels_command_work_on_off });
        }
    }
}