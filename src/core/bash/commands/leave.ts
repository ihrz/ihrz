/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Client } from "discord.js";
import logger from "../../logger";

export = function (client: Client, args: string) {
    if (!args) {
        return logger.legacy(`[*] I have not received the Guild's ID on the command.`.gray.bgBlack);
    };

    let guild = client.guilds.cache.get(args);

    guild?.leave().catch(() => {
        logger.legacy(`* The guild doesn't exist on bot's database.`.gray.bgBlack);
    });

    logger.legacy(`* I have succefully leave the server.`.gray.bgBlack);
};