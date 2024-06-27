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

        let result = await isMessageCommand(client, message);

        if (result.s) {
            result.c?.run(client, message, Date.now(), result.a);
            return true;
        } else {
            return false;
        };
    },
};