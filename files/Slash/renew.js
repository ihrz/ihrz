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

module.exports = {
    name: 'renew',
    description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    run: async (client, interaction) => {

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
            here.send(`${interaction.user} channel re-created !`)
        } catch (error) {
            return interaction.reply({ content: ":x: **Can't** `don\'t have permission !` lmao" })
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
    }
}