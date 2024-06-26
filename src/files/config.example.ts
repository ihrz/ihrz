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

import { ConfigData } from '../../types/configDatad';

const config: ConfigData = {

    discord: {

        token: "The bot token",
        // The Discord Bot Token

        phonePresence: false
        // If the bot have Phone Bot Activity Presence
    },

    lavalink: {

        nodes: [
            {

                id: "example_node",
                // The ID of the Node

                host: "lavalink.example.com",
                // The Host of the Node

                port: 2333,
                // The port of the Node

                authorization: "password",
                // The password of the Node

            }
        ],

    },

    core: {

        blacklistPictureInEmbed: "An png url",
        // The image of the blacklist's Embed (When blacklisted user attempt to interact with the bot)

    },

    command: {

        alway100: ['171356978310938624x1099042785736282205']
        /*
        For love command, if you want for specific couple of user, 
        always show 100% for their love, adding it to the array
        Format: {USER_ID_ONE}x{USER_ID_TWO}
        */

    },

    owner: {

        ownerid1: "User id",

        ownerid2: "User id",
        /*
        This owners have different permissions than the others in the db,
        
        * They are allowed to use /eval command everywhere.
        * They can't be unowner by owner who are in the Database.
        * They can't be blacklisted by owner who are in the Database.
        * They can't be banned by owner who are in the Database.
        */

    },

    api: {

        apiToken: "The api token",
        // The API token for secure requests, please put a strong token, Need to be private for security reason.

    },

    console: {

        emojis: {

            OK: "✅", ERROR: "❌", HOST: "💻", KISA: "👩", LOAD: "🔄"

        }

    },

};

export default config;