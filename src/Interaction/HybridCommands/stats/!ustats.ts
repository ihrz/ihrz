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
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Client,
    GuildMember,
    Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';

import {
    calculateMessageTime,
    calculateVoiceActivity,
    calculateActiveChannels,
    calculateActiveVoiceChannels,
    getChannelName,
    getChannelMessagesCount,
    getChannelMinutesCount,
} from "../../../core/functions/userStatsUtils.js";

export const subCommand: SubCommand = {
    run: async (
        client: Client,
        interaction: ChatInputCommandInteraction<"cached"> | Message,
        lang: LanguageData,
        args?: string[]
    ) => {


        // Guard's Typing
        if (
            !client.user ||
            !interaction.member ||
            !interaction.guild ||
            !interaction.channel
        )
            return;

        let member: GuildMember;
        let user;

        if (interaction instanceof ChatInputCommandInteraction) {
            member = (interaction.options.getMember('member') || interaction.member) as GuildMember;
            user = interaction.user;
        } else {
            member = (client.method.member(interaction, args!, 0) || interaction.member) as GuildMember;
            user = interaction.author;
        }

        let res = (await client.db.get(`${interaction.guildId}.STATS.USER.${member.user.id}`)) as DatabaseStructure.UserStats | null;

        if (!res) {
            return await client.method.interactionSend(interaction, { content: lang.unblacklist_user_is_not_exist })
        }

        let monthlyVoiceActivity = 0
        let weeklyVoiceActivity = 0;
        let dailyVoiceActivity = 0;

        let monthlyMessages: DatabaseStructure.StatsMessage[] = [];
        let weeklyMessages: DatabaseStructure.StatsMessage[] = [];
        let dailyMessages: DatabaseStructure.StatsMessage[] = [];
        let totalMessages: number = res.messages?.length || 0;

        let nowTimestamp = Date.now();

        let dailyTimeout = 86_400_000; // 24 hours in ms
        let weeklyTimeout = 604_800_000; // One week in ms
        let monthlyTimeout = 2_592_000_000; // One month in ms

        let firstActiveVoiceChannel = "";
        let secondActiveVoiceChannel = "";
        let thirdActiveVoiceChannel = "";

        let firstActiveChannel = "";
        let secondActiveChannel = "";
        let thirdActiveChannel = "";

        res.messages?.forEach((msg) => {
            const result = calculateMessageTime(
                msg,
                nowTimestamp,
                dailyTimeout,
                weeklyTimeout,
                monthlyTimeout,
                dailyMessages,
                weeklyMessages,
                monthlyMessages
            );
            dailyMessages = result.dailyMessages;
            weeklyMessages = result.weeklyMessages;
            monthlyMessages = result.monthlyMessages;
        });

        res.voices?.forEach((voice) => {
            const result = calculateVoiceActivity(
                voice,
                nowTimestamp,
                dailyTimeout,
                weeklyTimeout,
                monthlyTimeout,
                dailyVoiceActivity,
                weeklyVoiceActivity,
                monthlyVoiceActivity
            );
            dailyVoiceActivity = result.dailyVoiceActivity;
            weeklyVoiceActivity = result.weeklyVoiceActivity;
            monthlyVoiceActivity = result.monthlyVoiceActivity;
        });

        const activeChannels = calculateActiveChannels(res.messages || []);
        firstActiveChannel = activeChannels.firstActiveChannel;
        secondActiveChannel = activeChannels.secondActiveChannel;
        thirdActiveChannel = activeChannels.thirdActiveChannel;

        const activeVoiceChannels = calculateActiveVoiceChannels(res.voices || []);
        firstActiveVoiceChannel = activeVoiceChannels.firstActiveVoiceChannel;
        secondActiveVoiceChannel = activeVoiceChannels.secondActiveVoiceChannel;
        thirdActiveVoiceChannel = activeVoiceChannels.thirdActiveVoiceChannel;

        let htmlContent = client.htmlfiles['userStatsPage'];

        const messageDataArray = Array(30).fill(0);
        const voiceDataArray = Array(30).fill(0);


        monthlyMessages.forEach(msg => {
            const dayIndex = Math.floor((nowTimestamp - msg.sentTimestamp) / 86400000);
            if (dayIndex >= 0 && dayIndex < 30) {
                messageDataArray[29 - dayIndex] += 1;
            }
        });

        monthlyMessages.forEach(msg => {
            const dayIndex = Math.floor((nowTimestamp - msg.sentTimestamp) / 86400000);
            if (dayIndex >= 0 && dayIndex < 30) {
                messageDataArray[29 - dayIndex] += 1;
            }
        });

        (res.voices || []).forEach(voice => {
            const dayIndex = Math.floor((nowTimestamp - voice.startTimestamp) / 86400000);
            if (dayIndex >= 0 && dayIndex < 30) {
                const sessionDuration = (voice.endTimestamp - voice.startTimestamp) / 1000 / 60;
                voiceDataArray[29 - dayIndex] += sessionDuration;
            }
        })

        const now = Date.now();

        const timeLabels = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(now - ((29 - i) * 24 * 60 * 60 * 1000));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        htmlContent = htmlContent
            .replaceAll("{username}", member.user.globalName || member.user.displayName)
            .replaceAll("{guild_name}", interaction.guild.name)
            .replaceAll('{header_h1_value}', lang.header_h1_value)
            .replaceAll('{messages_word}', lang.messages_word)
            .replaceAll('{voice_activity}', lang.voice_activity)
            .replaceAll('{minutes_word}', lang.minutes_word)
            .replaceAll('{top_voice}', lang.top_voice)
            .replaceAll('{top_message}', lang.top_message)
            .replaceAll('{author_username}', member.user.globalName || member.user.displayName)
            .replaceAll('{author_pfp}', member.user.displayAvatarURL({ size: 512 }))
            .replaceAll('{guild_name}', interaction.guild.name)
            .replaceAll('{messages_length}', String(totalMessages))
            .replaceAll('{voice_daily}', String(client.timeCalculator.to_beautiful_string(dailyVoiceActivity, lang)))
            .replaceAll('{voice_weekly}', String(client.timeCalculator.to_beautiful_string(weeklyVoiceActivity, lang)))
            .replaceAll('{voice_monthly}', String(client.timeCalculator.to_beautiful_string(monthlyVoiceActivity, lang)))
            .replaceAll('{message_daily}', String(dailyMessages.length))
            .replaceAll('{message_weekly}', String(weeklyMessages.length))
            .replaceAll('{message_monthly}', String(monthlyMessages.length))
            .replaceAll('{messages_top1}', String(getChannelName(interaction.guild, firstActiveChannel)))
            .replaceAll('{messages_top2}', String(getChannelName(interaction.guild, secondActiveChannel)))
            .replaceAll('{messages_top3}', String(getChannelName(interaction.guild, thirdActiveChannel)))
            .replaceAll('{messages_top1_2}', String(getChannelMessagesCount(firstActiveChannel, res.messages || [])))
            .replaceAll('{messages_top2_2}', String(getChannelMessagesCount(secondActiveChannel, res.messages || [])))
            .replaceAll('{messages_top3_2}', String(getChannelMessagesCount(thirdActiveChannel, res.messages || [])))
            .replaceAll('{voice_top1}', String(getChannelName(interaction.guild, firstActiveVoiceChannel)))
            .replaceAll('{voice_top2}', String(getChannelName(interaction.guild, secondActiveVoiceChannel)))
            .replaceAll('{voice_top3}', String(getChannelName(interaction.guild, thirdActiveVoiceChannel)))
            .replaceAll('{voice_top1_2}', String(client.timeCalculator.to_beautiful_string(getChannelMinutesCount(firstActiveVoiceChannel, res.voices || []) * 60_000, lang)))
            .replaceAll('{voice_top2_2}', String(client.timeCalculator.to_beautiful_string(getChannelMinutesCount(secondActiveVoiceChannel, res.voices || []) * 60_000, lang)))
            .replaceAll('{voice_top3_2}', String(client.timeCalculator.to_beautiful_string(getChannelMinutesCount(thirdActiveVoiceChannel, res.voices || []) * 60_000, lang)))
            .replaceAll("{var_1d}", lang.var_1d)
            .replaceAll("{var_7d}", lang.var_7d)
            .replaceAll("{var_14d}", lang.var_14d)
            .replace('{message_voice_diag}', 'Votre contenu ici')
            .replace('{ messageData }', JSON.stringify(messageDataArray))
            .replace('{ voiceData }', JSON.stringify(voiceDataArray))
            .replace('{ timeLabels }', JSON.stringify(timeLabels))
            ;

        const image = await client.method.imageManipulation.html2Png(htmlContent, {
            elementSelector: '.card',
            omitBackground: true,
            selectElement: true,
            width: 1280,
            height: 706,
            scaleSize: 1
        });

        const attachment = new AttachmentBuilder(image, { name: 'image.png' });

        await client.method.interactionSend(interaction, { files: [attachment] });
    },
};
