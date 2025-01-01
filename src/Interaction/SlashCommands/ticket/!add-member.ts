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

import {
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
} from 'discord.js';

import { TicketAddMember } from '../../../core/modules/ticketsManager.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { Option } from '../../../../types/option.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, command: Option | Command | undefined, neededPerm: number) => {        


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.GUILD.TICKET.disable`)) {
            await interaction.editReply({ content: lang.ticket_disabled_command });
            return;
        };
        if (!(interaction.channel as BaseGuildTextChannel).name.includes('ticket-')) {
            await interaction.editReply({ content: lang.close_not_in_ticket });
            return;
        };
        await TicketAddMember(interaction);
    },
};