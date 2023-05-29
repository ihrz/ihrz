const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = async (client, channel) => {
    if (channel.name !== "ihorizon-logs") return;
    let data = await getLanguageData(channel.guild.id);
    
    let setup_embed = new EmbedBuilder()
        .setColor("#1e1d22")
        .setTitle(data.event_channel_create_message_embed_title)
        .setDescription(data.event_channel_create_message_embed_description);
    channel.send({ embeds: [setup_embed] });
    
};