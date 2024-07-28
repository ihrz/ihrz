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
    PermissionsBitField,
    ChatInputCommandInteraction,
    AttachmentBuilder,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setup_not_admin });
            return;
        };

        const dbGuild = await client.db.get(`${interaction.guildId}`);

        let buffer = Buffer.from(JSON.stringify(dbGuild), 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: interaction.guildId + '.json' })

        await interaction.editReply({ content: data.guildconfig_config_save_check_dm });

        await interaction.user.send({
            content: data.guildconfig_config_save_user_msg
                .replace("${interaction.guild.name}", interaction.guild.name),
            files: [attachment]
        })
            .catch(() => { })
            .then(() => { });

        return
    },
};