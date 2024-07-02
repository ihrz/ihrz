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
    ApplicationCommandOptionType,
    EmbedBuilder,
    PermissionsBitField,
    ChatInputCommandInteraction,
    ApplicationCommandType,
    GuildMember,
    Message,
    MessagePayload,
    InteractionEditReplyOptions,
    MessageReplyOptions
} from 'pwss'

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
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member") as GuildMember;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var member = client.args.member(interaction, 0) || interaction.member;
        };

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: data.punishpub_not_admin });
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
                    .setFooter(await client.args.bot.footerBuilder(interaction));

                await client.args.interactionSend(interaction, {
                    embeds: [embed],
                    files: [await client.args.bot.footerAttachmentBuilder(interaction)]
                });
            })
            .catch(err => {
                client.args.interactionSend(interaction, { content: data.derank_msg_failed });
            });
    },
};