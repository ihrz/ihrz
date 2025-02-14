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

import { Client, GuildMember } from 'discord.js';

import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';
import { LanguageData } from '../../../types/languageData.js';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        try {
            let baseData = await client.db.get(`${member.guild.id}.UTILS.NICK_KICKER`) as DatabaseStructure.NickKickerData | null;
            let lang = await client.func.getLanguageData(member.guild.id);

            if (baseData?.enabled &&
                (
                    baseData.words.some(word => member.user.username.toLowerCase().includes(word.toLowerCase()))
                    ||
                    baseData.words.some(word => member.user.displayName?.toLowerCase().includes(word.toLowerCase()))
                    ||
                    baseData.words.some(word => member.user.globalName?.toLowerCase().includes(word.toLowerCase()))
                )) {
                member.send({
                    content: lang.event_nick_kicker_kick_msg
                        .replace("${member.guild.name}", member.guild.name)
                })
                    .catch(() => { })
                    .then(() => { });
                member.kick(lang.event_nick_kicker_kick_reason)
                    .catch(() => { })
                    .then(() => { });
            }

        } catch (error) {
            return;
        }
    },
};