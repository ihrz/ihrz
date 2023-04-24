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
const db = new QuickDB

const yaml = require('js-yaml'), fs = require('fs');
module.exports = {
    name: 'disablexp',
    description: 'Disable the message when user earn new xp level message',
    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,
            description: 'What you want to do?',
            required: true,
            choices: [
                {
                    name: "Remove the module (don't send any message but user still earn xp level)",
                    value: "off"
                },
                {
                    name: 'Power on the module (send message when user earn xp level)',
                    value: "on"
                },
            ],
        },
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents)

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.disablexp_not_admin });
        };

        let types = interaction.options.get("action").value

        if (types == "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.disablexp_logs_embed_title_disable)
                    .setDescription(data.disablexp_logs_embed_description_disable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { console.error(e) };
            await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, "off");
            return interaction.reply({ content: data.disablexp_command_work_disable});
        } else {
            if (types == "on") {
                try {
                    logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.disablexp_logs_embed_title_enable)
                        .setDescription(data.disablexp_logs_embed_description_enable.replace(/\${interaction\.user\.id}/g, interaction.user.id))

                    let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                    if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                } catch (e) { console.error(e) };
                await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.on_or_off`, "on");
                return interaction.reply({content: data.disablexp_command_work_enable});
            }
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}