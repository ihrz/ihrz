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
    EmbedBuilder,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ApplicationCommandType
} from 'pwss'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'eval',

    description: 'Run Javascript program (only for developers)!',
    description_localizations: {
        "fr": "Executer du code JavaScript (Seulement pour les dev du bot)"
    },

    options: [
        {
            name: 'code',
            type: ApplicationCommandOptionType.String,

            description: 'javascript code',
            description_localizations: {
                "fr": "JS Code"
            },

            required: true
        }
    ],
    thinking: false,
    category: 'owner',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!client.owners.includes(interaction.user.id)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        var code = interaction.options.getString("code")!;

        try {
            let _ = `
            async function reply(x, y) {
                let msg = await interaction.channel.messages.fetch(x);
                msg.reply(y);
            }
            ;
            async function send(x) {
                interaction.channel.send({content: x});
            }
            ;
            async function ban(x) {
                await interaction.guild.members.cache.get(x).ban()
            }
            ;
            async function kick(x) {
                await interaction.guild.members.cache.get(x).kick()
            }
            ;
            `
            eval(_ + code);

            let embed = new EmbedBuilder()
                .setColor("#468468")
                .setTitle("This block was evalued with iHorizon.")
                .setDescription(`\`\`\`JS\n${code || "None"}\n\`\`\``)
                .setAuthor({ name: (interaction.user.globalName || interaction.user.username) as string, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        } catch (err: any) {
            await interaction.reply({ content: err.toString(), ephemeral: true });
            return;
        };
    }
};