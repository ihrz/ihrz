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

import { Client } from 'discord.js';
import { BashCommands } from '../../../../types/bashCommands.js';
import wait from '../../functions/wait.js';
import logger from '../../logger.js';

export const command: BashCommands = {
    command_name: "shutdown",
    command_description: "Shutdown the bot",
    aliases: ["exit", "poweroff"],
    run: async function (client: Client, args: string) {
        logger.legacy(`* Closed session...`.gray.bgBlack);

        await wait(1000);
        logger.legacy(`\n* Unload all script...`.gray.bgBlack);

        await wait(1000);
        logger.legacy(`* All are successfully unloaded`.gray.bgBlack);

        logger.legacy(`* Power off...`.red.bgBlack);

        client.shard?.send("shutdown");
        await client.destroy();
        process.kill(process.ppid, 9);
        process.kill(process.pid, 9);
    }
};