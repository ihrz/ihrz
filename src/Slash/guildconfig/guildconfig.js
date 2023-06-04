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
    Collection,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} = require('discord.js');

module.exports = {
    name: 'guildconfig',
    description: "Show the guild\'s config",
    run: async (client, interaction) => {
        const getLanguageData = require(`${process.cwd()}/src/lang/getLanguageData`);
        let data = await getLanguageData(interaction.guild.id);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.guildprofil_not_admin });
        }
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();

        let setchannelsjoin = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
        let setchannelsleave = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
        let joinroles = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
        let joinDmMessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`)
        let blockpub = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`)
        let joinmessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`)
        let leavemessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`)
        let punishPub = await db.get(`${interaction.guild.id}.GUILD.PUNISH.PUNISH_PUB`)
        let supportConfig = await db.get(`${interaction.guild.id}.GUILD.SUPPORT`)
        let reactionrole;

        try {
            var text = '';
            var text2 = '';
            const dbAll = await db.all();
            const foundArray = dbAll.findIndex(ticketList => ticketList.id === interaction.guild.id)

            const charForTicket = dbAll[foundArray].value.GUILD.TICKET;
            const charForRr = dbAll[foundArray].value.GUILD.REACTION_ROLES;

            for (var i in charForTicket) {
                var a = await db.get(`${interaction.guild.id}.GUILD.TICKET.${i}`)
                if (a) {
                    text += `**${a.panelName}**: <#${a.channel}>\n`
                };
            };

            for (var i in charForRr) {
                var a = await db.get(`${interaction.guild.id}.GUILD.REACTION_ROLES.${i}`)
                if (a) {
                    const stringContent = Object.keys(a).map((key) => {
                        const rolesID = a[key].rolesID;
                        var emoji = interaction.guild.emojis.cache.find(emoji => emoji.id === key);

                        return data.guildprofil_set_reactionrole
                            .replace(/\${rolesID}/g, rolesID)
                            .replace(/\${emoji\s*\|\|\s*key}/g, emoji || key)
                            .replace(/\${i}/g, i)
                            ;
                    }).join('\n');
                    text2 = stringContent
                };
            };
        } catch {

        }


        if (!text2 || text2 == '') {
            reactionrole = data.guildprofil_not_set_reactionrole
        } else { reactionrole = text2 };

        if (!text || text == '') {
            ticketFetched = data.guildprofil_not_set_ticketFetched
        } else { ticketFetched = text };

        if (!punishPub || punishPub === null) {
            punishPub = data.guildprofil_not_set_punishPub
        } else {
            punishPub = data.guildprofil_set_punishPub
                .replace(/\${punishPub\.punishementType}/g, punishPub.punishementType)
                .replace(/\${punishPub\.amountMax}/g, punishPub.amountMax)
        }

        if (!supportConfig || supportConfig === null) {
            supportConfig = data.guildprofil_not_set_supportConfig
        } else {
            supportConfig = data.guildprofil_set_supportConfig
                .replace(/\${supportConfig\.input}/g, supportConfig.input)
                .replace(/\${supportConfig\.rolesId}/g, supportConfig.rolesId)
        }

        if (!setchannelsjoin || setchannelsjoin === null) {
            setchannelsjoin = data.guildprofil_not_set_setchannelsjoin
        } else { setchannelsjoin = `<#${setchannelsjoin}>` }

        if (!setchannelsleave || setchannelsleave === null) {
            setchannelsleave = data.guildprofil_not_set_setchannelsleave
        } else { setchannelsleave = `<#${setchannelsleave}>` }

        if (!joinmessage || joinmessage == null) {
            joinmessage = data.guildprofil_not_set_joinmessage
        }
        if (!leavemessage || leavemessage == null) {
            leavemessage = data.guildprofil_not_set_leavemessage
        }

        if (!joinroles || joinroles === null) {
            joinroles = data.guildprofil_not_set_joinroles
        } else { joinroles = `<@&${joinroles}>` }

        if (!joinDmMessage || joinDmMessage === null) {
            joinDmMessage = data.guildprofil_not_set_joinDmMessage
        }

        if (blockpub != "on") {
            blockpub = data.guildprofil_not_set_blockpub
        } else { blockpub = data.guildprofil_set_blockpub }

        let guildc = new EmbedBuilder()
            .setColor("#016c9a")
            .setDescription(data.guildprofil_embed_description
                .replace(/\${interaction\.guild\.name}/g, interaction.guild.name)
            )
            .addFields(
                { name: data.guildprofil_embed_fields_joinmessage, value: joinmessage, inline: true },
                { name: data.guildprofil_embed_fields_leavemessage, value: leavemessage, inline: true },
                { name: data.guildprofil_embed_fields_setchannelsjoin, value: setchannelsjoin, inline: true },
                { name: data.guildprofil_embed_fields_setchannelsleave, value: setchannelsleave, inline: true },
                { name: data.guildprofil_embed_fields_joinroles, value: joinroles, inline: true },
                { name: data.guildprofil_embed_fields_joinDmMessage, value: joinDmMessage, inline: true },
                { name: data.guildprofil_embed_fields_blockpub, value: blockpub, inline: true },
                { name: data.guildprofil_embed_fields_punishPub, value: punishPub, inline: true },
                { name: data.guildprofil_embed_fields_supportConfig, value: supportConfig, inline: true },
                { name: data.guildprofil_embed_fields_ticketFetched, value: ticketFetched, inline: true },
                { name: data.guildprofil_embed_fields_reactionrole, value: reactionrole, inline: true })
            .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
        return interaction.reply({ embeds: [guildc] });
    }
}
