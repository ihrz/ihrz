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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionsBitField,
    User,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command.js';
import { Option } from '../../../../types/option.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: Command, allowed: boolean, args?: string[]) => {


        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member?.permissions.has(permissionsArray);

        if (!permissions && !allowed) {
            await client.method.interactionSend(interaction, { content: lang.poll_not_admin });
            return;
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString("action");
        } else {
            
            var action = client.method.string(args!, 0);
        }

        await client.db.set(`${interaction.guildId}.GUILD.FUN.states`, action);

        let action_type = action === "off" ? lang.var_disabled : lang.var_enabled;

        await client.method.interactionSend(interaction, {
            content: lang.fun_disable_command_msg
                .replace("${action_type}", action_type)
                .replace("${interaction.member?.user.toString()}", String(interaction.member?.user.toString()))
        });
        return;
    },
};