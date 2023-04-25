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

const yaml = require('js-yaml'), fs = require('fs');

module.exports = {
    name: 'kick',
    description: 'kick a member in guild',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'the member you want to kick',
            required: true
        }
    ],
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
        let data = yaml.load(fileContents);

        const member = interaction.options.getMember("member")
        const permission = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)
        if (!permission) return interaction.reply({ content: "❌ | You don't have permission to kick members." });
        if (!member) return interaction.reply({ content: `🔍 | Cannot find this member` });
        if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.KickMembers])) { return interaction.reply("I don't have permission to kick members!") }
        if (member.user.id === interaction.member.id) { return interaction.reply("❌ | You cannot kick yourself!") };

        if (interaction.member.roles.highest.position < member.roles.highest.position) return message.reply("🛑 You cannot kick user who have higher role than you...");
        member.send(`You are kicked from this server: **${interaction.guild.name}** by \`${interaction.member.user.username}#${interaction.member.user.discriminator}\``)
            .then(() => {
                member.kick({ reason: 'kicked by ' + interaction.user.username })
                    .then((member) => {
                        interaction.reply(`${member.user} kicked by ${interaction.user}`);
                        try {
                            logEmbed = new EmbedBuilder()
                                .setColor("#bf0bb9")
                                .setTitle("Kick Logs")
                                .setDescription(`${member.user} kick by <@${interaction.user.id}>`);

                            let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                            if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
                        } catch (e) { console.error(e) };
                    })

            })
    }
};