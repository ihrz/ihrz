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
    EmbedBuilder,
    PermissionsBitField,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    GuildMember
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {

    name: 'derank',

    description: 'Remove all roles of an members',
    description_localizations: {
        "fr": "Supprimer tous les rôles d'un membre"
    },

    category: 'utils',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,

            description: 'The user',
            description_localizations: {
                "fr": "l'utilisateur"
            },

            required: true,
        },
    ],
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let member = interaction.options.getMember("member") as GuildMember;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.punishpub_not_admin });
            return;
        };

        let rolesToRemove = member.roles.cache;
        let promises: Promise<void>[] = [];

        let good = 0;
        let bad = 0;

        rolesToRemove.forEach(role => {
            if (role.id === role.guild.roles.everyone.id) return;
            promises.push(
                member.roles.remove(role?.id)
                    .then(() => {
                        good++;
                        return;
                    })
                    .catch(() => {
                        bad++;
                        return;
                    })
            );
        })

        Promise.all(promises)
            .then(async () => {
                let embed = new EmbedBuilder()
                    .setColor(2829617)
                    .setTimestamp()
                    .setDescription(data.derank_msg_desc_embed
                        .replace('${good}', good.toString())
                        .replace('${bad}', bad.toString())
                        .replace('${member.id}', member.id)
                    )
                    .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

                interaction.editReply({
                    embeds: [embed],
                    files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
                });
            })
            .catch(err => {
                interaction.editReply({ content: data.derank_msg_failed });
            });
    },
};