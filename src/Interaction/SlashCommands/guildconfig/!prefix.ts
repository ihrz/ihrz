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
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let action = interaction.options.getString("action")!;
        let prefix = interaction.options.getString('name');

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setup_not_admin });
            return;
        };

        if (action === "mention") {
            await client.db.delete(`${interaction.guildId}.BOT.prefix`);
            await interaction.editReply({ content: data.guildconfig_setbot_prefix_prefix_now_mention })
        } else if (action === "change") {
            if (!prefix) return await interaction.editReply({ content: data.guildconfig_setbot_prefix_prefix_specify_prefix });
            if (prefix.length >= 5) return await interaction.editReply({ content: data.guildconfig_setbot_prefix_prefix_too_long });

            let formatedPrefix = prefix.split(" ")[0];
            await client.db.set(`${interaction.guildId}.BOT.prefix`, formatedPrefix);

            await interaction.editReply({
                content: data.guildconfig_setbot_prefix_prefix_is_good
                    .replace("${formatedPrefix}", formatedPrefix)
            });
            return;
        }
    },
};