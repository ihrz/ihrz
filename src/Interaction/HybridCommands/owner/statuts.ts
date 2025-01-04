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
    ApplicationCommandOptionType,
    ActivityType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Message,
    PresenceStatusData
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'status',

    description: 'Set the status of the bot !',
    description_localizations: {
        "fr": "Définir le status du bot"
    },

    options: [
        {
            name: 'type',
            type: ApplicationCommandOptionType.String,

            description: 'The type of activity you want!',
            description_localizations: {
                "fr": "Quelle type d'activité voulez-vous ?"
            },

            required: true,
            choices: [
                {
                    name: 'Reset Status',
                    value: 'reset'
                },
                {
                    name: 'Online',
                    value: 'online'
                },
                {
                    name: 'Do not disturb',
                    value: 'dnd'
                },
                {
                    name: 'Idle',
                    value: 'idle'
                },
            ]
        },
    ],
    category: 'owner',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client<boolean>, interaction: any, lang: LanguageData, command: any, allowed: boolean, args?: string[]): Promise<any> => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action_1 = interaction.options.getString("type")!;
        } else {
            var action_1 = client.method.string(args!, 0)!;
        };

        let table = client.db.table('OWNER');

        if (await table.get(`${interaction.member.user.id}.owner`)
            !== true) {
            await client.method.interactionSend(interaction, { content: lang.owner_not_owner });
            return;
        };

        let baseData = await client.db.get("BOT.PRESENCE");

        await client.db.set(`BOT.PRESENCE.status`, action_1);


        client.user?.setPresence({
            status: (action_1 || "online") as PresenceStatusData,
            activities: [
                {
                    type: baseData?.type || ActivityType.Custom,
                    name: baseData?.name || "Custom this Presence with /presence",
                }
            ],
        });

        await client.method.interactionSend(interaction, { content: `✅` });
        return;
    },
};