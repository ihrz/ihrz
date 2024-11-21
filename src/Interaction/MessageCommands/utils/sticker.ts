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

import {
    Client,
    Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option.js';

export const command: Command = {
    name: 'sticker',
    aliases: ['stickers'],

    description: 'Add a sticker from the replied message',
    description_localizations: {
        "fr": "Créer un sticker depuis un message répondu"
    },

    thinking: false,
    category: 'utils',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, message: Message<true>, lang: LanguageData, command: Command | Option | undefined, neededPerm, options?: string[]) => {
        if (message.reference) {
            let msg = await message.channel.messages.fetch(message.reference.messageId || "");

            if (msg.stickers.size === 0) {
                return await client.method.interactionSend(message, {
                    content: 'No sticker found in the replied message.'
                });
            } else {
                let sticker = msg.stickers.first()!;

                await message.guild.stickers.create({
                    file: sticker.url,
                    name: sticker.name,
                    description: sticker.description,
                    tags: sticker?.tags || "copied"
                }).then(async x => {
                    await client.method.interactionSend(message, {
                        content: `The sticker \`${x.name}\` has been successfully created.`
                    });
                }).catch(async err => {
                    await client.method.interactionSend(message, {
                        content: `The sticker could not be created. An error occurred: \`${err.message}\`.`
                    });
                });
            }
        } else {
            return await client.method.interactionSend(message, {
                content: 'Please reply to a message containing a sticker.'
            });
        }
        return;
    },
};
