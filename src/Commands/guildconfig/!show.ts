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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.guildprofil_not_admin });
            return;
        };

        let baseData = await client.db.get(`${interaction.guild?.id}.GUILD`);

        let setchannelsjoin = (baseData?.['GUILD_CONFIG'])?.join;
        let setchannelsleave = (baseData?.['GUILD_CONFIG'])?.leave;
        let joinroles = (baseData?.['GUILD_CONFIG'])?.joinroles;
        let joinDmMessage = (baseData?.['GUILD_CONFIG'])?.joindm;
        let blockpub = (baseData?.['GUILD_CONFIG'])?.antipub;
        let joinmessage = (baseData?.['GUILD_CONFIG'])?.joinmessage;
        let leavemessage = (baseData?.['GUILD_CONFIG'])?.leavemessage;
        let punishPub = (baseData?.['PUNISH'])?.PUNISH_PUB;
        let supportConfig = baseData?.['SUPPORT'];
        let xp = baseData?.['XP_LEVELING'];
        let logs = baseData?.['SERVER_LOGS'];
        let blockBot = baseData?.['BLOCK_BOT'];

        let reactionrole;
        let xpStats;
        let logsStat: string = '';
        let blockBotStat: string = '';

        var text2: string = '';
        var ticketFetched;
        var text: string = '';

        try {
            let charForTicket = baseData?.['TICKET'];
            let charForRr = baseData?.['REACTION_ROLES'];

            for (var i in charForTicket) {
                if (baseData?.['TICKET'][i] && baseData?.['TICKET'][i].used) {
                    text += `**${baseData?.['TICKET'][i].panelName}**: <#${baseData['TICKET'][i].channel}>\n`;
                };
            };

            for (var i in charForRr) {
                var a = baseData?.['REACTION_ROLES'][i];

                if (a) {
                    let stringContent = Object.keys(a).map((key) => {
                        let rolesID = a?.[key].rolesID;
                        var emoji = interaction.guild?.emojis.cache.find((emoji: { id: string; }) => emoji.id === key);

                        return data.guildprofil_set_reactionrole
                            .replace(/\${rolesID}/g, rolesID)
                            .replace(/\${emoji\s*\|\|\s*key}/g, emoji || key)
                            .replace(/\${i}/g, i);
                    }).join('\n');
                    text2 = stringContent;
                };
            };
        } catch (e) {
        };

        if (!text2 || text2 == '') {
            reactionrole = data.guildprofil_not_set_reactionrole;
        } else {
            reactionrole = text2;
        };

        if (!text || text == '') {
            ticketFetched = data.guildprofil_not_set_ticketFetched;
        } else {
            ticketFetched = text;
        };

        if (!punishPub || punishPub === null) {
            punishPub = data.guildprofil_not_set_punishPub;
        } else {
            punishPub = data.guildprofil_set_punishPub
                .replace(/\${punishPub\.punishementType}/g, punishPub.punishementType)
                .replace(/\${punishPub\.amountMax}/g, punishPub.amountMax);
        };

        if (!supportConfig || supportConfig === null) {
            supportConfig = data.guildprofil_not_set_supportConfig;
        } else {
            supportConfig = data.guildprofil_set_supportConfig
                .replace(/\${supportConfig\.input}/g, supportConfig.input)
                .replace(/\${supportConfig\.rolesId}/g, supportConfig.rolesId);
        };

        if (!setchannelsjoin || setchannelsjoin === null) {
            setchannelsjoin = data.guildprofil_not_set_setchannelsjoin;
        } else {
            setchannelsjoin = `<#${setchannelsjoin}>`;
        };

        if (!setchannelsleave || setchannelsleave === null) {
            setchannelsleave = data.guildprofil_not_set_setchannelsleave;
        } else {
            setchannelsleave = `<#${setchannelsleave}>`;
        };

        if (!joinmessage || joinmessage == null) {
            joinmessage = data.guildprofil_not_set_joinmessage;
        }
        if (!leavemessage || leavemessage == null) {
            leavemessage = data.guildprofil_not_set_leavemessage;
        };

        if (!joinroles || joinroles === null) {
            joinroles = data.guildprofil_not_set_joinroles;
        } else {
            joinroles = `<@&${joinroles}>`;
        };

        if (!joinDmMessage || joinDmMessage === null) {
            joinDmMessage = data.guildprofil_not_set_joinDmMessage;
        };

        if (blockpub != "on") {
            blockpub = data.guildprofil_not_set_blockpub;
        } else {
            blockpub = data.guildprofil_set_blockpub;
        };

        if (xp?.disable === false) {
            xpStats = data.guildprofil_disable_xp;
        } else {
            xpStats = data.guildprofil_enable_xp;
            if (xp?.xpchannels) {
                xpStats = data.guildprofil_another_enable_xp
                    .replace('${xp.xpchannels}', xp.xpchannels);
            }
        };

        if (logs) {
            if (logs?.roles) logsStat += `<#${logs.roles}>,`;
            if (logs?.moderation) logsStat += `<#${logs.moderation}>,`;
            if (logs?.voice) logsStat += `<#${logs.voice}>,`;
            if (logs?.message) logsStat += `<#${logs.message}>`;
        } else {
            logsStat = data.guildprofil_not_logs_set;
        };

        if (blockBot) {
            blockBotStat = data.guildprofil_blockbot_on;
        } else {
            blockBotStat = data.guildprofil_blockbot_off;
        };

        let guildc = new EmbedBuilder()
            .setColor("#016c9a")
            .setDescription(data.guildprofil_embed_description
                .replace(/\${interaction\.guild\.name}/g, interaction.guild?.name)
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
                { name: data.guildprofil_embed_fields_reactionrole, value: reactionrole, inline: true },
                { name: data.guildprofil_embed_fields_ranks, value: xpStats, inline: true },
                { name: data.guildprofil_embed_fields_logs, value: logsStat, inline: true },
                { name: data.guildprofil_embed_fields_blockbot, value: blockBotStat, inline: true })
            .setThumbnail(interaction.guild?.iconURL() as string);

        await interaction.editReply({ embeds: [guildc] });
        return;
    },
};