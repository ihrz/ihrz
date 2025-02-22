/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BashCommands } from '../../../../types/bashCommands.js';

export const command: BashCommands = {
    command_name: "ban",
    command_description: "Ban a member from the guild",
    aliases: [],
    run: async function (client, stream, args) {
        let guild = client.guilds.cache.get(args[0]);
        if (!guild) {
            stream.write(`* Guild not found \n\r`.red.bgBlack);
            return
        }

        let member = guild.members.cache.get(args[1]);
        if (!member) {
            stream.write(`* Member not found \n\r`.red.bgBlack);
            return
        }

        // Verify if the bot has permission to ban the member
        if (!member.bannable) {
            stream.write(`* I don't have permission to ban this member \n\r`.red.bgBlack);
            return
        }

        // Ban the member
        member.ban({ reason: `iHorizon SSH - ` + args.slice(2).join(" ") });
        stream.write(`* Successfully banned ${member.user.tag} \n\r`.green.bgBlack);
    }
};