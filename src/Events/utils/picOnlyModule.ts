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

import { Client, Message, PermissionFlagsBits } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { LanguageData } from '../../../types/languageData.js';

const warnings = new Map<string, number[]>();

const cleanOldWarnings = (userId: string) => {
    const userWarnings = warnings.get(userId);
    if (!userWarnings) return;

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentWarnings = userWarnings.filter(timestamp => timestamp > tenMinutesAgo);

    if (recentWarnings.length === 0) {
        warnings.delete(userId);
    } else {
        warnings.set(userId, recentWarnings);
    }
};

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {
        if (message.author.bot) return;

        const picOnlyChannels = await client.db.get(`${message.guildId}.UTILS.picOnly`) as DatabaseStructure.UtilsData["picOnly"];
        const picOnlyConfig = await client.db.get(`${message.guildId}.UTILS.picOnlyConfig`) as DatabaseStructure.PicOnlyConfig;

        if (picOnlyChannels?.includes(message.channelId) && !message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const hasValidImageAttachment = Array.from(message.attachments.values()).some(attachment => {
                const validImageTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'image/bmp',
                    'image/tiff'
                ];
                const contentType = attachment.contentType;
                return contentType && validImageTypes.includes(contentType.toLowerCase());
            });

            let lang = await client.func.getLanguageData(message.guildId);

            if (!hasValidImageAttachment) {
                await message.delete();

                const userId = message.author.id;
                cleanOldWarnings(userId);

                const userWarnings = warnings.get(userId) || [];
                userWarnings.push(Date.now());
                warnings.set(userId, userWarnings);

                let threshold = picOnlyConfig.threshold || 3;

                if (userWarnings.length >= 3) {
                    warnings.delete(userId);

                    try {
                        await message.member?.timeout((picOnlyConfig.muteTime || 10 * 60 * 1000), lang.piconly_module_timeout_reason);
                        await client.func.method.warnMember(
                            message.guild?.members.me!,
                            message.member!,
                            "Automated Punishment - Pic Only"
                        ).catch(() => { });

                        await message.author.send({
                            content: lang.piconly_module_punish_msg
                                .replace("${message.author}", message.author.toString())
                        }).catch(() => false);
                    } catch {
                    }
                } else {
                    await message.author.send({
                        content: lang.piconly_module_warn_msg
                            .replace("${message.author}", message.author.toString())
                            .replace("${userWarnings.length}", String(userWarnings.length))
                            .replace("${threshold}", String(threshold))
                    }).catch(() => false);
                }
            }
        }
    }
};