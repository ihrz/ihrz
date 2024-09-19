/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Command } from '../../../types/command';
import { BotEvent } from '../../../types/event';
import { BaseGuildTextChannel, Client, EmbedBuilder, GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import { LanguageData } from '../../../types/languageData';

export async function isMessageCommand(client: Client, message: Message): Promise<{ s: boolean, a?: string[], c?: Command }> {
    var prefix = await client.func.prefix.guildPrefix(client, message.guildId!);

    let args = message.content.slice(prefix.string.length).trim().split(/ +/g);
    let command = client.message_commands.get(args.shift()?.toLowerCase() as string);

    if (message.content.startsWith(prefix.string) && command) {
        return { s: true, a: args, c: command };
    } else {
        return { s: false, a: undefined, c: undefined };
    };
};

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {

        if (!message.guild || message.author.bot || !message.channel) return;

        if (await client.method.helper.coolDown(message, "msg_commands", 1000)) {
            return;
        };

        if (await client.db.table('BLACKLIST').get(`${message.author.id}.blacklisted`)) {
            return;
        };

        let result = await isMessageCommand(client, message);

        if (result.s) {

            try {
                let lang = await client.func.getLanguageData(message.guildId) as LanguageData;
                await result.c?.run(client, message, lang, { name: result.c?.name, command: result.c }, Date.now(), result.a);
            } catch (err) {
                let block = `\`\`\`TS\nMessage: The command ran into a problem!\nCommand Name: ${result.c?.name}\nError: ${err}\`\`\`\n`
                let channel = client.channels.cache.get(client.config.core.reportChannelID);

                if (channel) {

                    return (channel as BaseGuildTextChannel).send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`MSG_CMD_CRASH_NOT_HANDLE`)
                                .setDescription(block)
                                .setTimestamp()
                                .setFields(
                                    {
                                        name: "🛡️ Bot Admin",
                                        value: message.guild?.members.me?.permissions.has(PermissionFlagsBits.Administrator) ? "yes" : "no"
                                    },
                                    {
                                        name: "📝 User Admin",
                                        value: (message.member as GuildMember)?.permissions.has(PermissionFlagsBits.Administrator) ? "yes" : "no"
                                    },
                                    {
                                        name: "** **",
                                        value: message.content
                                    },
                                )
                        ]
                    })
                }

            }
        };
    },
};