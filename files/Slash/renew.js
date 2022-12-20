const Discord = require('discord.js')
const db = require('quick.db')
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

module.exports = {
    name: 'renew',
    description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    run: async (client, interaction) => {
     
    if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: "you don't have admin permission !"})
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
                reason:  `Channel re-create by ${interaction.user} (${interaction.user.id})`
            })
            channel.delete() 
            here.send(`${interaction.user} channel re-created !`)
        } catch (error) {
            return console.error(error)
        }
        const filter = (interaction) => interaction.user.id === interaction.member.id;
}}