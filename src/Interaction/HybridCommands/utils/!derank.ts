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
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member") as GuildMember;
        } else {
            var member = client.method.member(interaction, args!, 0) || interaction.member;
        };

        if (!member) {
            await client.method.interactionSend(interaction, { content: lang.perm_list_no_user });
            return;
        }

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
                    .setDescription(lang.derank_msg_desc_embed
                        .replace('${good}', good.toString())
                        .replace('${bad}', bad.toString())
                        .replace('${member.id}', member.id)
                    )
                    .setFooter(await client.method.bot.footerBuilder(interaction));

                await client.method.interactionSend(interaction, {
                    embeds: [embed],
                    files: [await client.method.bot.footerAttachmentBuilder(interaction)]
                });
            })
            .catch(err => {
                client.method.interactionSend(interaction, { content: lang.derank_msg_failed });
            });
    },
};