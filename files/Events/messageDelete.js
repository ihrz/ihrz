const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const hidden = require(`${process.cwd()}/files/core/maskLink`);

module.exports = async (client, message) => {

    async function snipeModules() {
        if (!message.guild) return;
        if (!message.author) return;
        if (message.author.id == client.user.id) return;

        await db.set(`${message.guild.id}.GUILD.SNIPE.${message.channel.id}`,
            {
                snipe: `${hidden.maskLink(message.content)}`,
                snipeUserInfoTag: `${message.author.username} (${message.author.id} )`,
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`,
                snipeTimestamp: Date.now()
            });
    };

    async function serverLogs() {
        if (!message.guild) return;
        if (!message.author) return;
        if (message.author.id == client.user.id) return;

        const guildId = message.guild.id;
        const someinfo = await db.get(`${guildId}.GUILD.SERVER_LOGS.message`);
        if (!someinfo) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ format: 'png', dynamic: true, size: 512 }) })
            .setDescription(`**Message supprimé dans <#${message.channel.id}>**\n${message.content}`)
            .setTimestamp();

        if (message.attachments) {
            const attachments = message.attachments;
            const attachment = attachments.first();

            if (attachment && attachment.contentType.startsWith('image/')) {
                const imageUrl = attachment.attachment;
                logsEmbed.setImage(imageUrl)
            };
        }

        await client.channels.cache.get(someinfo).send({ embeds: [logsEmbed] }).catch(() => { });
    };

    await snipeModules(), serverLogs();
};