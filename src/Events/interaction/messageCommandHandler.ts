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
import { Client, Message } from 'pwss';
import { LanguageData } from '../../../types/languageData';

var timeout: number = 1600;

export async function cooldDown(message: Message, method: string) {
    let tn = Date.now();
    let table = message.client.db.table("TEMP");
    var fetch = await table.get(`COOLDOWN.${method}.${message.author.id}`);
    if (fetch !== null && timeout - (tn - fetch) > 0) return true;

    await table.set(`COOLDOWN.${method}.${message.author.id}`, tn);
    return false;
};

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

        if (await cooldDown(message, "msg_commands")) {
            return;
        };

        if (await client.db.table('BLACKLIST').get(`${message.author.id}.blacklisted`)) {
            return;
        };

        let result = await isMessageCommand(client, message);

        if (result.s) {
            let lang = await client.func.getLanguageData(message.guildId) as LanguageData;
            result.c?.run(client, message, lang, result.c, Date.now(), result.a);
            return true;
        } else {
            return false;
        };
    },
};