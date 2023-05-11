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

    await snipeModules();
};