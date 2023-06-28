/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

const {
    Client,
    Intents,
    ChannelType,
    Collection,
    EmbedBuilder,
    PermissionFlagsBits,
    Permissions,
    PermissionsBitField
} = require(`${process.cwd()}/files/ihorizonjs`);

const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);
const logger = require(`${process.cwd()}/src/core/logger`);
const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);

module.exports = async (client, reaction, user) => {
    let data = await getLanguageData(reaction.message.guildId);

    async function reactionRole() {
        try {
            if (user.bot || user.id == client.user.id || !reaction.message.guild) return;
            const fetched = await DataBaseModel({ id: DataBaseModel.Get, key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}` });

            if (fetched) {
                const role = reaction.message.guild.roles.cache.get(fetched.rolesID);
                if (!role) return;
                const member = reaction.message.guild.members.cache.get(user.id);
                return await member.roles.add(role);
            };

            const fetchedForNitro = await DataBaseModel({
                id: DataBaseModel.Get,
                key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`
            });

            if (fetchedForNitro) {
                const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
                if (!role) return;
                const member = reaction.message.guild.members.cache.get(user.id);
                return await member.roles.add(role);
            };
        } catch (e) {
            logger.log(e);
        };
    };

    async function ticketModule() {
        if (user.bot) return;
        let result = await DataBaseModel({ id: DataBaseModel.Get, key: `${reaction.message.guildId}.GUILD.TICKET.${reaction.message.id}` })
        if (!result || result.channel !== reaction.message.channelId
            || result.messageID !== reaction.message.id) return;

        if (reaction.message.guild.channels.cache.find(channel => channel.name === `ticket-${user.id}`)) {
            return reaction.users.remove(user);
        };

        reaction.message.guild.channels.create({
            name: `ticket-${user.id}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: reaction.message.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                }
            ],
        }).then(async channel => {
            await reaction.users.remove(user);
            let welcome = new EmbedBuilder()
                .setTitle(result.panelName)
                .setColor("#3b8f41")
                .setDescription(data.event_ticket_embed_description
                    .replace("${user.username}", user.username)
                )
                .setFooter({
                    text: 'iHorizon',
                    iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })
                });

            return channel.send({ content: `<@${user.id}>`, embeds: [welcome] });
        });
    };

    await reactionRole(), ticketModule();
};