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

import {
    Client,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    UserResolvable,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'unblacklist',

    description: 'The user you want to unblacklist (Only Owner of ihorizon)!',
    description_localizations: {
        "fr": "Enlever un utilisateur de la liste noir.(Seulement pour les dev)"
    },

    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,

            description: 'The user you want to unblacklist (Only Owner of ihorizon)',
            description_localizations: {
                "fr": "L'utilisateur que vous souhaitez supprimer de la liste noire (uniquement propriétaire d'ihorizon)"
            },

            required: true
        }
    ],
    thinking: false,
    category: 'owner',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let tableOwner = client.db.table('OWNER');
        let tableBlacklist = client.db.table('BLACKLIST');

        if (!await tableOwner.get(`${interaction.user.id}.owner`)) {
            await interaction.reply({ content: data.unblacklist_not_owner });
            return;
        };

        let member = interaction.options.getUser('member');
        let fetched = await tableBlacklist.get(`${member?.id}`);

        if (!fetched) {
            await interaction.reply({ content: data.unblacklist_not_blacklisted.replace(/\${member\.id}/g, member?.id!) });
            return;
        };

        try {
            let bannedMember = await client.users.fetch(member?.id as UserResolvable);

            if (!bannedMember) {
                await interaction.reply({ content: data.unblacklist_user_is_not_exist });
                return;
            };

            await tableBlacklist.delete(`${member?.id}`);
            await interaction.guild?.members.unban(bannedMember);

            await interaction.reply({ content: data.unblacklist_command_work.replace(/\${member\.id}/g, member?.id!) });
            return;
        } catch (e) {
            await tableBlacklist.delete(`${member?.id}`);
            await interaction.reply({
                content: data.unblacklist_unblacklisted_but_can_unban_him.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
            });
            return;
        };
    },
};