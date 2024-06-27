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

import { Client } from "pwss";

export const guildPrefix = async (client: Client, guildId: string): Promise<{ type: 'prefix' | 'mention'; string: string; }> => {
    let custom_prefix = await client.db.get(`${guildId}.BOT.prefix`);
    let prefix_string = ((!custom_prefix) ?
        client.config.discord.messageCommandsMention
            ? `<@${client.user?.id}>`
            : client.config.discord.defaultMessageCommandsPrefix
        : custom_prefix) || `<@${client.user?.id}>`

    return { string: prefix_string, type: prefix_string?.includes(client.user?.id!) ? 'mention' : 'prefix' }
};

export const defaultPrefix = (client: Client): { type: 'prefix' | 'mention'; string: string; } => {
    let prefix_string = (client.config.discord.messageCommandsMention
        ? `@Mention`
        : client.config.discord.defaultMessageCommandsPrefix
    ) as string;

    return { string: prefix_string, type: client.config.discord.messageCommandsMention ? 'mention' : 'prefix' }
};