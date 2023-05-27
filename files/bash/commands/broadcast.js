const { EmbedBuilder } = require("discord.js");
module.exports = function (client, args) {
    const args2 = args.split(" ");
    let embed = new EmbedBuilder()
        .setColor('#4dff00')
        .setTitle('@Broadcast message')
        .setDescription(`\`${args2.slice(0).join(" ")}\``)
        .setFooter({ text: `Kisakay - iHorizon`, iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 }) })
    client.guilds.cache.forEach(async (guild) => {
        let channel = guild.channels.cache.find(role => role.name === 'ihorizon-logs'); if (channel) { channel.send({ content: "@here", embeds: [embed] }) };
    });
    console.log(`【*】 All are successfully sended`.gray.bgBlack);
};