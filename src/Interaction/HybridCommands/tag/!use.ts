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
    InteractionEditReplyOptions,
    Message,
    MessagePayload,
    MessageReplyOptions,
    PermissionFlagsBits,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var tag_name = interaction.options.getString("tag_name", true);
            var mention = interaction.options.getMember("mention");
            var message_id = interaction.options.getString("message_id");
        } else {
            var tag_name = client.method.string(args!, 0)!;
            var mention = client.method.member(interaction, args!, 1);
            var message_id = client.method.string(args!, 2);
        }

        tag_name = tag_name.trim();

        let baseData = await client.db.get(`${interaction.guildId}.GUILD.TAGS`) as DatabaseStructure.GuildTagsStructure | undefined;

        if (!baseData?.storedTags?.[tag_name]) {
            await client.method.interactionSend(interaction, {
                content: lang.tag_doesnt_exist
                    .replace("${tag_name}", tag_name)
            });
            return;
        }

        let tag = baseData.storedTags[tag_name];

        // check administrator permission if is not allowed to use the tag
        let is_in_wl = interaction.member.roles.cache.some(role => baseData.whitelist_use?.includes(role.id))

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !is_in_wl) {
            await client.method.interactionSend(interaction, {
                content: lang.tag_use_not_allowed
                    .replace("${tag_name}", tag_name)
                    .replace("${tag.createBy}", tag.createBy)
            });
            return;
        }

        // send the tag content
        let embed = await client.db.get(`EMBED.${tag.embedId}`);

        if (interaction.channel.isSendable()) {
            if (message_id) {
                let message = await interaction.channel.messages.fetch(message_id).catch(() => null);
                if (message) {
                    await message.reply({
                        content: mention ? mention.toString() : undefined,
                        embeds: [embed?.embedSource],
                    });
                }
            }
            else {
                await interaction.channel.send({
                    content: mention ? mention.toString() : undefined,
                    embeds: [embed?.embedSource],
                });
            }
        }
        await client.method.interactionSend(interaction, {
            content: lang.tag_use_command_work
                .replace("${tag_name}", tag_name)
        });
        await client.db.set(`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.lastUseTimestamp`, Date.now());
        await client.db.set(`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.lastUseBy`, interaction.member.id);
        await client.db.add(`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.uses`, 1);
        return;
    },
};