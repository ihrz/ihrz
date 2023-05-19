const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config');
const fs = require("fs")

const yaml = require('js-yaml');
const getLanguage = require(`${process.cwd()}/files/lang/getLanguage`);

module.exports = async (client, channel) => {
    let fileContents = fs.readFileSync(`${process.cwd()}/files/lang/${await getLanguage(channel.guild.id)}.yml`, 'utf-8');
    let data = yaml.load(fileContents);

    if (channel.name === "ihorizon-logs") {
        let logchannel = channel.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        let setup_embed = new EmbedBuilder()
            .setColor("#1e1d22")
            .setTitle(data.event_channel_create_message_embed_title)
            .setDescription(data.event_channel_create_message_embed_description)
        return logchannel.send({ embeds: [setup_embed] });
    };
};