/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { DatabaseStucture } from '../../../core/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.guildprofil_not_admin });
            return;
        }

        let baseData = await client.db.get(`${interaction.guild?.id}.GUILD`) as DatabaseStucture.db_in_id['GUILD'];

        let setchannelsjoin = (baseData?.GUILD_CONFIG?.join) ?? data.guildprofil_not_set_setchannelsjoin;
        let setchannelsleave = (baseData?.GUILD_CONFIG?.leave) ?? data.guildprofil_not_set_setchannelsleave;
        let joinroles = (baseData?.GUILD_CONFIG?.joinroles) ?? data.guildprofil_not_set_joinroles;
        let joinDmMessage = (baseData?.GUILD_CONFIG?.joindm) ?? data.guildprofil_not_set_joinDmMessage;
        let blockpub = (baseData?.GUILD_CONFIG?.antipub === 'on') ? data.guildprofil_set_blockpub : data.guildprofil_not_set_blockpub;
        let joinmessage = (baseData?.GUILD_CONFIG?.joinmessage) ?? data.guildprofil_not_set_joinmessage;
        let leavemessage = (baseData?.GUILD_CONFIG?.leavemessage) ?? data.guildprofil_not_set_leavemessage;
        let punishPub = baseData?.PUNISH?.PUNISH_PUB;
        let supportConfig = baseData?.SUPPORT;
        let xp = baseData?.XP_LEVELING;
        let logs = baseData?.SERVER_LOGS;
        let blockBot = baseData?.BLOCK_BOT;

        let reactionrole;
        let xpStats;
        let logsStat: string = '';
        let blockBotStat: string = '';

        let text2: string = '';
        let ticketFetched: string = '';
        let text: string = '';

        let charForTicket = baseData?.['TICKET'];
        let charForRr = baseData?.['REACTION_ROLES'];

        for (const i in charForTicket) {
            const ticketConfig = charForTicket[i];
            if (ticketConfig && typeof ticketConfig !== 'string' && typeof ticketConfig !== 'boolean' && ticketConfig.used) {
                text += `**${ticketConfig.panelName}**: <#${ticketConfig.channel}>\n`;
            }
        }

        for (const i in charForRr) {
            const a = baseData?.REACTION_ROLES?.[i];

            if (a) {
                let stringContent = Object.keys(a).map((key) => {
                    const rolesID = a?.[key].rolesID;
                    const emoji = interaction.guild?.emojis.cache.find((emoji: { id: string; }) => emoji.id === key);

                    return data.guildprofil_set_reactionrole
                        .replace(/\${rolesID}/g, rolesID!)
                        .replace(/\${emoji\s*\|\|\s*key}/g, (emoji || key) as string)
                        .replace(/\${i}/g, i);
                }).join('\n');
                text2 = stringContent;
            }
        }

        reactionrole = text2 || data.guildprofil_not_set_reactionrole;
        ticketFetched = text || data.guildprofil_not_set_ticketFetched;

        var punish_pub = punishPub ? data.guildprofil_set_punishPub
            .replace(/\${punishPub\.punishementType}/g, punishPub.punishementType ?? '')
            .replace(/\${punishPub\.amountMax}/g, String(punishPub.amountMax ?? 0)) : data.guildprofil_not_set_punishPub;

        var support_config = supportConfig ? data.guildprofil_set_supportConfig
            .replace(/\${supportConfig\.input}/g, supportConfig.input ?? '')
            .replace(/\${supportConfig\.rolesId}/g, supportConfig.rolesId ?? '') : data.guildprofil_not_set_supportConfig;

        xpStats = (xp?.disable === false) ? (xp?.xpchannels ? data.guildprofil_another_enable_xp.replace('${xp.xpchannels}', xp.xpchannels) : data.guildprofil_enable_xp) : data.guildprofil_disable_xp;

        logsStat = logs ? [logs.roles, logs.moderation, logs.voice, logs.message].filter(Boolean).map(log => `<#${log}>`).join(',') : data.guildprofil_not_logs_set;

        blockBotStat = blockBot ? data.guildprofil_blockbot_on : data.guildprofil_blockbot_off;

        const guildc = new EmbedBuilder()
            .setColor("#016c9a")
            .setDescription(data.guildprofil_embed_description
                .replace(/\${interaction\.guild\.name}/g, interaction.guild?.name as string)
            )
            .addFields(
                { name: data.guildprofil_embed_fields_joinmessage, value: joinmessage, inline: true },
                { name: data.guildprofil_embed_fields_leavemessage, value: leavemessage, inline: true },
                { name: data.guildprofil_embed_fields_setchannelsjoin, value: setchannelsjoin, inline: true },
                { name: data.guildprofil_embed_fields_setchannelsleave, value: setchannelsleave, inline: true },
                { name: data.guildprofil_embed_fields_joinroles, value: joinroles, inline: true },
                { name: data.guildprofil_embed_fields_joinDmMessage, value: joinDmMessage, inline: true },
                { name: data.guildprofil_embed_fields_blockpub, value: blockpub, inline: true },
                { name: data.guildprofil_embed_fields_punishPub, value: punish_pub, inline: true },
                { name: data.guildprofil_embed_fields_supportConfig, value: support_config, inline: true },
                { name: data.guildprofil_embed_fields_ticketFetched, value: ticketFetched, inline: true },
                { name: data.guildprofil_embed_fields_reactionrole, value: reactionrole, inline: true },
                { name: data.guildprofil_embed_fields_ranks, value: xpStats, inline: true },
                { name: data.guildprofil_embed_fields_logs, value: logsStat, inline: true },
                { name: data.guildprofil_embed_fields_blockbot, value: blockBotStat, inline: true }
            )
            .setThumbnail(interaction.guild?.iconURL() as string);

        await interaction.editReply({ embeds: [guildc] });
        return;
    }
};