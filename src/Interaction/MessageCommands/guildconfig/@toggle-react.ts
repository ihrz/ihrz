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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: 'toggle-react',
    aliases: ['react-toggle', 'togglereact', 'reacttoggle'],

    description: 'Enable / Disable the reaction when user greets someone',
    description_localizations: {
        "fr": "Activer/Désactiver la réaction lorsque l'utilisateur salue quelqu'un"
    },

    thinking: false,
    category: 'guildconfig',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message) => {
        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        let permission = interaction.member?.permissions?.has(PermissionsBitField.Flags.AddReactions);

        let active: boolean;

        if (!permission) {
            await interaction.reply({ content: data.setup_not_admin, allowedMentions: { repliedUser: false } });
            return;
        }

        if (await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`) === true) {

            active = false;
            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`, active)
        } else {

            active = true;
            await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.hey_reaction`, active)
        };

        await interaction.reply({ content: `<@${interaction.member?.id}>, maintenant quand un membre envoie un message de bienvenue, le bot **${active ? 'réagis' : 'ne réagis pas'}**`, allowedMentions: { repliedUser: false } });
        return;
    },
};