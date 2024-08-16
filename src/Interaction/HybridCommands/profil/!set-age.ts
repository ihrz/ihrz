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
    ChatInputCommandInteraction,
    Client,
    Message,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        if (interaction instanceof ChatInputCommandInteraction) {
            var age = interaction.options.getNumber("age")!;
            var user = interaction.user;
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var age = client.method.number(args!, 0);
            var user = interaction.author;
        };

        let tableProfil = client.db.table('USER_PROFIL');

        await tableProfil.set(`${user.id}.age`, age);

        await client.method.interactionSend(interaction,{ content: data.setprofilage_command_work, ephemeral: true });
        return;
    },
};