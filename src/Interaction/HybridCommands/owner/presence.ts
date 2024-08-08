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
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';

export const command: Command = {
    name: 'presence',

    description: 'Set the presence of the bot !',
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
                    name: 'Streaming',
                    value: 'streaming'
                },
                {
                    name: 'Playing',
                    value: 'playing'
                },
                {
                    name: 'Listening',
                    value: 'listening'
                },
                {
                    name: 'Watching',
                    value: 'watching'
                },
                {
                    name: 'Custom',
                    value: 'custom'
                },
                {
                    name: 'Competing',
                    value: 'competing'
                },
            ]
        },
        {
            name: 'name',
            type: ApplicationCommandOptionType.String,

            description: 'The activity text',
            description_localizations: {
                "fr": "Le texte du status"
            },

            required: true,
        },
        {
            name: 'twitch_username',
            type: ApplicationCommandOptionType.String,

            description: 'The twitch account Username when you choose Streaming type',
            description_localizations: {
                "fr": "Le nom d'utilisateur du compte Twitch lorsque vous choisissez le type de streaming"
            },

            required: false,
        }
    ],
    category: 'owner',
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: any) => {
        let action_1 = interaction.options.getString("type");
        let action_2 = interaction.options.getString("name");
        let action_3 = interaction.options.getString("twitch_username") || "anaissaraiva";

        let table = client.db.table('OWNER');

        if (await table.get(`${interaction.user.id}.owner`)
            !== true) {

            await interaction.deleteReply();
            await interaction.followUp({ content: '❌', ephemeral: true });
            return;
        };

        switch (action_1) {
            case 'streaming':
                client.user?.setActivity(action_2, {
                    type: ActivityType.Streaming,
                    url: `https://www.twitch.tv/${action_3}`
                });
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Streaming,
                        twitch_username: action_3,
                        name: action_2
                    }
                );
                break;
            case 'watching':
                client.user?.setActivity(action_2,
                    {
                        type: ActivityType.Watching,
                        url: "https://www.twitch.tv/anaissaraiva"
                    }
                );
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Watching,
                        name: action_2
                    }
                );
                break;
            case 'playing':
                client.user?.setActivity(action_2, {
                    type: ActivityType.Playing,
                    url: "https://www.twitch.tv/anaissaraiva"
                });
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Playing,
                        name: action_2
                    }
                );
                break;
            case 'listening':
                client.user?.setActivity(action_2, {
                    type: ActivityType.Listening,
                    url: "https://www.twitch.tv/anaissaraiva"
                });
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Listening,
                        name: action_2,
                        url: 'https://twitch.tv/anaissaraiva'
                    }
                );
                break;
            case 'custom':
                client.user?.setActivity(action_2, {
                    type: ActivityType.Custom,
                    url: "https://www.twitch.tv/anaissaraiva"
                });
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Custom,
                        name: action_2,
                        url: 'https://twitch.tv/anaissaraiva'
                    }
                );
                break;
            case 'competing':
                client.user?.setActivity(action_2, {
                    type: ActivityType.Competing,
                    url: "https://www.twitch.tv/anaissaraiva"
                });
                await client.db.set(`BOT.PRESENCE`,
                    {
                        type: ActivityType.Competing,
                        name: action_2,
                        url: 'https://twitch.tv/anaissaraiva'
                    }
                );
                break;
            default:
                await client.db.delete(`BOT.PRESENCE`);
                break;
        };

        await interaction.editReply({ content: `✅` });
        return;
    },
};