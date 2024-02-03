/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

interface Badge {
    Discord_Employee: string;
    Partnered_Server_Owner: string;
    HypeSquad_Events: string;
    Bug_Hunter_Level_1: string;
    Bug_Hunter_Level_2: string;
    Early_Supporter: string;
    Early_Verified_Bot_Developer: string;
    House_Bravery: string;
    House_Brilliance: string;
    House_Balance: string;
    Active_Developers: string;
    Discord_Moderators: string;
    Slash_Bot: string;
    Nitro: string;
    Server_Boost_Badge: string;
}

interface Icon {
    Crown_Logo: string;
    Boosting_24_Months_Logo: string;
    Discord_Nitro_Animated_Logo: string;
    Green_Tick_Logo: string;
    NodeJS_Logo: string;
    Yes_Logo: string;
    No_Logo: string;
    Stop_Logo: string;
    Wallet_Logo: string;
    Music_Icon: string;
    Disk: string;
    Warning_Icon: string;
    Coin: string;
    Pin: string;
    Timer: string;
    Sparkles: string;
    Prefix_Command: string;
}

export interface Emojis {
    badge: Badge;
    icon: Icon;
}