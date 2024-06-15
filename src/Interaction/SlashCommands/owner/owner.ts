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
    EmbedBuilder,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'owner',

    description: 'add user to owner list (can\'t be used by normal member)!',
    description_localizations: {
        "fr": "Ajoutez un membre dans la liste des propriétaire de iHorizon. (Seulement pour les dev)"
    },

    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,

            description: 'The member you want to made owner of the iHorizon Projects',
            description_localizations: {
                "fr": "Le membre que vous souhaitez rendre propriétaire des projets Horizon"
            },

            required: false
        }
    ],
    thinking: false,
    category: 'owner',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let tableOwner = client.db.table('OWNER');
        let isOwner = await tableOwner.get(interaction.user.id);

        var text = "";
        var char = await tableOwner.all();

        for (let entry of char) {
            text += `<@${entry.id}>\n`;
        }

        if (!isOwner.owner) {
            await interaction.reply({ content: data.owner_not_owner });
            return;
        };

        let embed = new EmbedBuilder()
            .setColor("#2E2EFE")
            .setAuthor({ name: "Owners" })
            .setDescription(text)
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

        let member = interaction.options.getMember('member') as GuildMember;

        if (!member) {
            await interaction.reply({ embeds: [embed], files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }] });
            return;
        };

        let checkAx = await tableOwner.get(`${member.id}.owner`);

        if (checkAx) {
            await interaction.reply({ content: data.owner_already_owner });
            return;
        };

        await tableOwner.set(`${member.user.id}`, { owner: true });
        await interaction.reply({ content: data.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.user.globalName!) });
        return;
    },
};