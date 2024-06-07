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

import { Client, Interaction } from 'discord.js';
import { BotEvent } from '../../../types/event';

const processedMembers = new Set<string>();

export const event: BotEvent = {
    name: "interactionCreate",
    run: async (client: Client, interaction: Interaction) => {
        /**
         * Why doing this?
         * On iHorizon Production, we have some ~discord.js problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         * As always, fuck discord.js
         */
        if (processedMembers.has(interaction.user.id)) return;
        processedMembers.add(interaction.user.id);
        setTimeout(() => processedMembers.delete(interaction.user.id), 1300);

        if (!interaction.isContextMenuCommand()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        let cmd = client.applicationsCommands.get(interaction.commandName);
        if (cmd && cmd.thinking) { await interaction.deferReply(); };
        if (cmd) { cmd.run(client, interaction) };
    },
};