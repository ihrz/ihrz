const { QuickDB } = require("quick.db");
const db = new QuickDB();
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
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = {
    name: 'renew',
    description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    run: async (client, interaction) => {
        let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(interaction.guild.id)}.yml`, 'utf-8');
        let data = yaml.load(fileContents);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: "you don't have admin permission !" })
        let channel = interaction.channel
        try {
            let here = await channel.clone({
                name: channel.name,
                permissions: channel.permissionsOverwrites,
                type: channel.type,
                topic: channel.withTopic,
                nsfw: channel.nsfw,
                birate: channel.bitrate,
                userLimit: channel.userLimit,
                rateLimitPerUser: channel.rateLimitPerUser,
                permissions: channel.withPermissions,
                position: channel.rawPosition,
                reason: `Channel re-create by ${interaction.user} (${interaction.user.id})`
            })

            channel.delete()
            here.send({ content: data.renew_channel_send_success.replace(/\${interaction\.user}/g, interaction.user) })
        } catch (error) {
            return interaction.reply({ content: data.renew_dont_have_permission })
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}