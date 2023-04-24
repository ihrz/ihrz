module.exports = {
    name: 'guildconfig',
    description: 'Show the guild\'s config',
    run: async (client, interaction) => {

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

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: ":x: | You must be an administrator of this server! " });
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



        try{
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
    
                        return `**MessageID**: \`${i}\` -> ${emoji || key} give <@&${rolesID}> role\n`;
                    }).join('\n');
                    text2 = stringContent
                };
            };
        }catch {
            
        }


        if (!text2 || text2 == '') {
            reactionrole = "No set!"
        } else { reactionrole = text2 };

        if (!text || text == '') {
            ticketFetched = "No set!"
        } else { ticketFetched = text };

        if (!punishPub || punishPub === null) {
            punishPub = "No set !"
        } else { punishPub = `\`${punishPub.punishementType}\`: max: \`${punishPub.amountMax}\` flags.` }

        if (!supportConfig || supportConfig === null) {
            supportConfig = "No set !"
        } else { supportConfig = `\`${supportConfig.input}\` in bio give <@&${supportConfig.rolesId}> role.` }

        if (!setchannelsjoin || setchannelsjoin === null) {
            setchannelsjoin = "No set !"
        } else { setchannelsjoin = `<#${setchannelsjoin}>` }

        if (!setchannelsleave || setchannelsleave === null) {
            setchannelsleave = "No set !"
        } else { setchannelsleave = `<#${setchannelsleave}>` }

        if (!joinmessage || joinmessage == null) {
            joinmessage = "No set !"
        }
        if (!leavemessage || leavemessage == null) {
            leavemessage = "No set !"
        }

        if (!joinroles || joinroles === null) {
            joinroles = "No set !"
        } else { joinroles = `<@&${joinroles}>` }

        if (!joinDmMessage || joinDmMessage === null) {
            joinDmMessage = "No set !"
        }

        if (blockpub != "on") {
            blockpub = "Power off"
        } else { blockpub = "Power on" }

        let guildc = new EmbedBuilder()
            .setColor("#016c9a")
            .setDescription("`Guild Config:` " + interaction.guild.name + " !")
            .addFields(
                { name: "Join Message", value: joinmessage, inline: true },
                { name: "Leave Message", value: leavemessage, inline: true },
                { name: "Channel Join", value: setchannelsjoin, inline: true },
                { name: "Channel Leave", value: setchannelsleave, inline: true },
                { name: "Join Role", value: joinroles, inline: true },
                { name: "JoinDM", value: joinDmMessage, inline: true },
                { name: "BlockPub", value: blockpub, inline: true },
                { name: "PunishPub", value: punishPub, inline: true },
                { name: "Support", value: supportConfig, inline: true },
                { name: "Tickets", value: ticketFetched, inline: true },
                { name: "Reaction Role", value: reactionrole, inline: true })
            .setThumbnail(`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.png`)
        return interaction.reply({ embeds: [guildc] });
    }
}
