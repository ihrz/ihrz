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
        let type = interaction.options.getString("action")
        let argsid = interaction.options.getChannel("channel").id

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: ":x: | You must be an administrator of this server to request this commands!" });

        if (type === "on") {
            if (!argsid) return interaction.reply({ content: "You must specify a valid channel for you configurations." })

            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle("SetXpChannels Logs")
                    .setDescription(`<@${interaction.user.id}> set the custom xp channels to: <#${argsid}>`)

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { console.error(e) };
            try {
                let already = await db.get(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`)
                if (already === argsid) return interaction.reply({ content: 'The custom xp channels is already config with this channels id!' })
                client.channels.cache.get(argsid).send({ content: "**Custom XP channel set here!**" })
                await db.set(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`, argsid);

                return interaction.reply({ content: "You have successfully set the custom xp channel to <#" + argsid + ">" });

            } catch (e) {
                interaction.reply({ content: "Error: missing permissions or channel doesn't exist" });
            }


        }
        if (type == "off") {
            try {
                logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle("SetXpChannels Logs")
                    .setDescription(`<@${interaction.user.id}> disable the custom xp channels. I put the default settings...`)

                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
            } catch (e) { console.error(e) };
            try {
                let already2 = await db.get(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`)
                if (already2 === "off") return interaction.reply('The custom xp channels is already disable !')


                await db.delete(`${interaction.guild.id}.GUILD.XP_LEVELING.xpchannels`);
                return interaction.reply("You have successfully disable the custom xp channel !");

            } catch (e) {
                interaction.reply("Error: missing permissions or channel doesn't exist");
            }
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}



