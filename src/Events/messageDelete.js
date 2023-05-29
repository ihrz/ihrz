const {Client, Collection, EmbedBuilder, PermissionsBitField} = require('discord.js');
const hidden = require(`${process.cwd()}/src/core/maskLink`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main`);

module.exports = async (client, message) => {
    let data = await getLanguageData(message.guild.id);

    async function snipeModules() {
        if (!message.guild) return;
        if (!message.author) return;
        if (message.author.id == client.user.id) return;

        await DataBaseModel({
            id: DataBaseModel.Set, key: `${message.guild.id}.GUILD.SNIPE.${message.channel.id}`,
            value: {
                snipe: `${await hidden.maskLink(message.content)}`,
                snipeUserInfoTag: `${message.author.username} (${message.author.id} )`,
                snipeUserInfoPp: `${message.author.displayAvatarURL()}`,
                snipeTimestamp: Date.now()
            }
        });
    };

    async function serverLogs() {
        if (!message.guild) return;
        if (!message.author) return;
        if (message.author.id == client.user.id) return;

        const guildId = message.guild.id;
        const someinfo = await DataBaseModel({id: DataBaseModel.Get, key: `${guildId}.GUILD.SERVER_LOGS.message`});

        if (!someinfo.data) return;

        let logsEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.avatarURL({format: 'png', dynamic: true, size: 512})
            })
            .setDescription(data.event_srvLogs_messageDelete_description
                .replace("${message.channel.id}", message.channel.id)
                .replace("${message.content}", message.content)
            )
            .setTimestamp();

        if (message.attachments) {
            const attachments = message.attachments;
            const attachment = attachments.first();

            if (attachment && attachment.contentType.startsWith('image/')) {
                const imageUrl = attachment.attachment;
                logsEmbed.setImage(imageUrl)
            }

            ;
        }

        await client.channels.cache.get(someinfo).send({embeds: [logsEmbed]}).catch(() => {

        });
    };

    await snipeModules(), serverLogs();
};