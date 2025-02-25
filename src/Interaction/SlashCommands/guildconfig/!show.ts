/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Guild,
    GuildMember,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command } from '../../../../types/command.js';

import { iHorizonTimeCalculator } from '../../../core/functions/ms.js';
import { AntiSpam } from '../../../../types/antispam.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        const originalResponse = await interaction.editReply({
            content: client.iHorizon_Emojis.icon.iHorizon_Discord_Loading
        });

        let baseData = await client.db.get(`${interaction.guildId}`) as DatabaseStructure.DbInId;
        const pages: EmbedBuilder[] = [];

        const joinDmMessageField = { name: lang.guildprofil_embed_fields_joinDmMessage, value: baseData?.GUILD?.GUILD_CONFIG?.joindm ? '```' + baseData?.GUILD?.GUILD_CONFIG?.joindm.substring(0, 1020) + '```' : lang.guildprofil_not_set_joinDmMessage };
        const joinMessageField = { name: lang.guildprofil_embed_fields_joinmessage, value: baseData?.GUILD?.GUILD_CONFIG?.joinmessage ? '```' + baseData?.GUILD?.GUILD_CONFIG?.joinmessage + '```' : lang.guildprofil_not_set_joinmessage };
        const leaveMessageField = { name: lang.guildprofil_embed_fields_leavemessage, value: baseData?.GUILD?.GUILD_CONFIG?.leavemessage ? '```' + baseData?.GUILD?.GUILD_CONFIG?.leavemessage + '```' : lang.guildprofil_not_set_leavemessage };

        const setChannelsLeaveField = { name: lang.guildprofil_embed_fields_setchannelsleave, value: baseData?.GUILD?.GUILD_CONFIG?.leave ? `<#${baseData?.GUILD?.GUILD_CONFIG?.leave}>` : lang.guildprofil_not_set_setchannelsleave };
        const setChannelsJoinField = { name: lang.guildprofil_embed_fields_setchannelsjoin, value: baseData?.GUILD?.GUILD_CONFIG?.join ? `<#${baseData?.GUILD?.GUILD_CONFIG?.join}>` : lang.guildprofil_not_set_setchannelsjoin };

        const joinRolesField = {
            name: lang.guildprofil_embed_fields_joinroles,
            value: Array.isArray(baseData?.GUILD?.GUILD_CONFIG?.joinroles) && baseData?.GUILD?.GUILD_CONFIG?.joinroles.length > 0
                ? baseData?.GUILD?.GUILD_CONFIG?.joinroles.map(x => `<@&${x}>`).join(', ')
                : lang.guildprofil_not_set_joinroles
        };
        const blockPubField = { name: lang.guildprofil_embed_fields_blockpub, value: (baseData?.GUILD?.GUILD_CONFIG?.antipub === 'on') ? lang.guildprofil_set_blockpub : lang.guildprofil_not_set_blockpub };

        const punishPubField = {
            name: lang.guildprofil_embed_fields_punishPub,
            value: baseData?.GUILD?.PUNISH?.PUNISH_PUB ? lang.guildprofil_set_punishPub
                .replace(/\${punishPub\.punishementType}/g, baseData.GUILD?.PUNISH?.PUNISH_PUB?.punishementType ?? '')
                .replace(/\${punishPub\.amountMax}/g, String(baseData.GUILD?.PUNISH?.PUNISH_PUB?.amountMax ?? 0)) : lang.guildprofil_not_set_punishPub
        };
        const supportConfigField = {
            name: lang.guildprofil_embed_fields_supportConfig,
            value: supportConfigToString(baseData?.GUILD?.SUPPORT, lang)
        };
        const ticketFetchedField = {
            name: lang.guildprofil_embed_fields_ticketFetched,
            value: ticketFetchedToString(baseData?.GUILD?.TICKET, lang)
        };
        const reactionRoleField = {
            name: lang.guildprofil_embed_fields_reactionrole,
            value: reactionRolesToString(baseData?.GUILD?.REACTION_ROLES, interaction.guild, lang)
        };
        const xpStatsField = {
            name: lang.guildprofil_embed_fields_ranks,
            value: xpStatsToString(baseData?.GUILD?.XP_LEVELING, lang)
        };
        const logsField = {
            name: lang.guildprofil_embed_fields_logs,
            value: logsToString(baseData?.GUILD?.SERVER_LOGS, lang)
        };
        const blockBotField = {
            name: lang.guildprofil_embed_fields_blockbot,
            value: blockBotToString(baseData?.GUILD?.BLOCK_BOT, lang)
        };

        const picOnlyChannelsField = {
            name: lang.utils_pic_only_embed_title,
            value: picOnlyChannelsToString(baseData.UTILS?.picOnly, lang)
        }

        const picOnlyConfigField = {
            name: lang.utils_pic_only_embed_title,
            value: picOnlyConfigToString(baseData.UTILS?.picOnlyConfig, lang)
        }

        const wlRolesField = {
            name: lang.utils_wlroles_embed_title,
            value: wlRolesToString(baseData.UTILS?.wlRoles, lang)
        }

        const joinGhostpingField = {
            name: lang.joinghostping_add_ok_embed_title,
            value: joinGhostpingToString(baseData.GUILD?.GUILD_CONFIG?.GHOST_PING, lang)
        }

        const antispamField = {
            name: lang.antispam_manage_embed_title,
            value: antispamToString(baseData.GUILD?.ANTISPAM, lang)
        }

        const tooNewAccountField = {
            name: lang.too_new_account_logEmbed_title,
            value: tooNewAccountToString(interaction.member, baseData.GUILD?.BLOCK_NEW_ACCOUNT, lang)
        }

        const roleSaverField = {
            name: lang.rolesaver_embed_title,
            value: roleSaverToString(baseData.GUILD?.GUILD_CONFIG?.rolesaver, lang)
        }

        const pfpsField = {
            name: lang.help_pfps_fields,
            value: pfpsToString(baseData?.PFPS, lang)
        }

        const securityField = {
            name: lang.help_security_fields,
            value: securityToString(baseData.SECURITY, lang)
        }

        const voiceDashField = {
            name: lang.help_voicedashboard_fields,
            value: voiceDashToString(baseData.VOICE_INTERFACE, lang)
        }

        const generateEmbedForFields = (fields: { name: string, value: string }[]) => {
            const embed = new EmbedBuilder()
                .setColor("#016c9a")
                .setDescription(lang.guildprofil_embed_description.replace(/\${interaction\.guild\.name}/g, interaction.guild?.name as string))
                .addFields(fields)
                .setThumbnail(interaction.guild?.iconURL() as string);
            pages.push(embed);
        };

        generateEmbedForFields([
            joinMessageField,
            leaveMessageField,
            setChannelsJoinField,
            setChannelsLeaveField,
            joinRolesField,
            joinDmMessageField
        ]);

        generateEmbedForFields([
            ticketFetchedField,
            reactionRoleField
        ]);

        generateEmbedForFields([
            blockPubField,
            punishPubField,
            supportConfigField,
        ]);

        generateEmbedForFields([
            xpStatsField,
            logsField,
            blockBotField
        ]);

        generateEmbedForFields([
            picOnlyChannelsField,
            picOnlyConfigField,
            wlRolesField,
            joinGhostpingField,
            antispamField
        ]);

        generateEmbedForFields([
            tooNewAccountField,
            roleSaverField,
            pfpsField,
            securityField,
            voiceDashField
        ])

        let currentPage = 0;

        const editCurrentPage = async () => {
            await interaction.editReply({
                content: null,
                embeds: [
                    pages[currentPage]
                        .setColor("#016c9a")
                        .setFooter({
                            text: lang.prevnames_embed_footer_text
                                .replace('${currentPage + 1}', (currentPage + 1).toString())
                                .replace('${pages.length}', pages.length.toString())
                        })
                ],
                components: [generateActionRow()],
            });
        };

        const generateActionRow = () => {
            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('<<')
                        .setCustomId('guildconf_before')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setLabel('>>')
                        .setCustomId('guildconf_after')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === pages.length - 1)
                );
            return actionRow;
        };

        await editCurrentPage();

        const collector = interaction.channel?.createMessageComponentCollector({
            filter: (i) => originalResponse.id == i.message.id && i.user.id === i.user.id,
            time: 60000
        });

        collector?.on('collect', async interaction => {
            await interaction.deferUpdate();
            if (interaction.customId === 'guildconf_before' && currentPage > 0) {
                currentPage--;
                await editCurrentPage();
            } else if (interaction.customId === 'guildconf_after' && currentPage < pages.length - 1) {
                currentPage++;
                await editCurrentPage();
            }
        });

        collector?.on('end', () => {
            const newComp = generateActionRow();

            newComp.components.forEach(x => {
                x.setDisabled(true);
            });

            interaction.editReply({
                components: [newComp],
            });
        });
    }
};

function supportConfigToString(supportConfig: DatabaseStructure.DbGuildObject["SUPPORT"], lang: LanguageData): string {
    return supportConfig ? lang.guildprofil_set_supportConfig
        .replace(/\${supportConfig\.input}/g, supportConfig.input ?? '')
        .replace(/\${supportConfig\.rolesId}/g, supportConfig.rolesId ?? '') : lang.guildprofil_not_set_supportConfig;
}

function ticketFetchedToString(charForTicket: DatabaseStructure.DbGuildObject["TICKET"], lang: LanguageData): string {
    let ticketFetched = '';
    for (const i in charForTicket) {
        const ticketConfig = charForTicket[i];
        if (ticketConfig && typeof ticketConfig !== 'string' && typeof ticketConfig !== 'boolean' && ticketConfig.used) {
            ticketFetched += `**${ticketConfig.panelName}**: <#${ticketConfig.channel}>\n`;
        }
    }
    return ticketFetched || lang.guildprofil_not_set_ticketFetched;
}

function reactionRolesToString(charForRr: DatabaseStructure.DbGuildObject["REACTION_ROLES"], guild: Guild, lang: LanguageData): string {
    let reactionrole = '';
    for (const i in charForRr) {
        const a = charForRr[i];
        if (a) {
            let stringContent = Object.keys(a).map((key) => {
                const rolesID = a?.[key].rolesID;
                const emoji = guild?.emojis.cache.find((emoji: { id: string; }) => emoji.id === key);

                return lang.guildprofil_set_reactionrole
                    .replace(/\${rolesID}/g, rolesID!)
                    .replace(/\${emoji\s*\|\|\s*key}/g, (emoji || key) as string)
                    .replace(/\${i}/g, i);
            }).join('\n');
            reactionrole = stringContent;
        }
    }
    return reactionrole || lang.guildprofil_not_set_reactionrole;
}

function xpStatsToString(xp: DatabaseStructure.DbGuildXpLeveling | undefined, lang: LanguageData): string {
    return (xp?.disable === false) ? (xp?.xpchannels ? lang.guildprofil_another_enable_xp.replace('${xp.xpchannels}', xp.xpchannels) : lang.guildprofil_enable_xp) : lang.guildprofil_disable_xp;
}

function logsToString(logs: DatabaseStructure.DbGuildObject['SERVER_LOGS'], lang: LanguageData): string {
    return logs ? [logs.roles, logs.moderation, logs.voice, logs.message, logs.boosts, logs.antispam].filter(Boolean).map(log => `<#${log}>`).join(',') : lang.guildprofil_not_logs_set;
}

function blockBotToString(blockBot: DatabaseStructure.DbGuildObject["BLOCK_BOT"], lang: LanguageData): string {
    return blockBot ? lang.guildprofil_blockbot_on : lang.guildprofil_blockbot_off;
}

function picOnlyChannelsToString(picOnly: DatabaseStructure.UtilsData["picOnly"] | undefined, lang: LanguageData): string {
    return (picOnly === undefined) || (picOnly.length === 0) ? lang.var_none : picOnly?.map((x: string) => `<#${x}>`).join(",");
}

function picOnlyConfigToString(picOnlyConfig: DatabaseStructure.PicOnlyConfig | undefined, lang: LanguageData): string {
    return picOnlyConfig === undefined ? lang.var_none : `\- ${lang.utils_piconly_embed_fields_3_name}: ${new iHorizonTimeCalculator().to_beautiful_string(picOnlyConfig.muteTime || 0, lang)}\n\- ${lang.utils_piconly_modal2_fields1_label}: ${picOnlyConfig.threshold}`
}

function wlRolesToString(wlRoles: DatabaseStructure.UtilsData["wlRoles"] | undefined, lang: LanguageData): string {
    return (wlRoles === undefined) || (wlRoles.length === 0) ? lang.var_none : lang.utils_wlroles_embed_desc + "\n" + wlRoles?.map((x: string) => `<@&${x}>`).join(",");
}

function joinGhostpingToString(gp: DatabaseStructure.GhostPingData | undefined, lang: LanguageData): string {
    return (gp?.channels === undefined) || (gp.channels.length === 0) ? lang.var_none : lang.joinghostping_add_ok_embed_desc + "\n" + gp.channels?.map((x: string) => `<#${x}>`).join(",");
}

function antispamToString(antispamConfig: AntiSpam.AntiSpamOptions | undefined, lang: LanguageData): string {
    return antispamConfig === undefined ? lang.var_none :
        `
\- ${lang.antispam_manage_choices_1_label}: \`${antispamConfig.Enabled ? "🟢" : "🔴"}\`
\- ${lang.antispam_manage_choices_6_desc}: \`${antispamConfig.removeMessages ? lang.var_yes : lang.var_no}\`
\- ${lang.antispam_manage_choices_3_label}: \`${antispamConfig.punishment_type}\`
\- ${lang.antispam_manage_choices_4_label}: \`${new iHorizonTimeCalculator().to_beautiful_string(antispamConfig.punishTime || 0, lang)}\`
\- ${lang.antispam_manage_choices_7_label}: \`${new iHorizonTimeCalculator().to_beautiful_string(antispamConfig.maxInterval || 0, lang)}\`
`
}

function tooNewAccountToString(user: GuildMember, tooNewConfig: DatabaseStructure.BlockNewAccountSchema | undefined, lang: LanguageData): string {
    return (tooNewConfig?.state === true) ? lang.too_new_account_logEmbed_desc_on_enable
        .replace('${interaction.user}', user.toString())
        .replace('${beautifulTime}', new iHorizonTimeCalculator().to_beautiful_string(tooNewConfig?.req || 0, lang)) : lang.var_no_set;
}

function roleSaverToString(rs: DatabaseStructure.RoleSaverSchema | undefined, lang: LanguageData): string {
    return (rs === undefined) || (rs.enable === false) ? lang.var_none :
        `
\- ${lang.rolesaver_embed_fields_1_name}: \`${rs.enable ? "🟢" : "🔴"}\`
\- ${lang.rolesaver_embed_fields_2_name}: \`${rs.admin ? lang.var_yes : lang.var_no}\`
\- ${lang.rolesaver_embed_fields_3_name}: \`${new iHorizonTimeCalculator().to_beautiful_string(rs.timeout || 0, lang)}\`
`
}

function pfpsToString(pfps: DatabaseStructure.DbInId["PFPS"] | undefined, lang: LanguageData) {
    return (pfps === undefined) || (pfps.disable === true) ? lang.var_no_set :
        `\- ${lang.var_text_channel}: <#${pfps.channel}>`
}

function securityToString(sec: DatabaseStructure.DbInId["SECURITY"] | undefined, lang: LanguageData) {
    return (sec === undefined) || (sec.disable === true) ? lang.var_no_set :
        `
\- ${lang.var_text_channel}: <#${sec.channel}>
\- ${lang.var_roles}: <@$${sec.role}>
`
}

function voiceDashToString(vc: DatabaseStructure.DbInId["VOICE_INTERFACE"] | undefined, lang: LanguageData) {
    return (vc === undefined) || (!vc.voice_channel) ? lang.var_no_set :
        `
\- ${lang.var_voice_channel}: <#${vc.voice_channel}>
\- ${lang.var_text_channel}: <#${vc.voice_channel}>
\- 💂‍♀️: ${vc.staff_role ? `<@&${vc.staff_role}>` : lang.var_no_set}
`
}