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
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
            await client.method.interactionSend(interaction, { content: lang.fun_category_disable });
            return;
        };
        if (interaction instanceof ChatInputCommandInteraction) {
            var pollMessage = interaction.options.getString("message");
            var user = interaction.user;
        } else {
            
            var pollMessage = client.method.string(args!, 0);
            var user = interaction.author;
        }

        let pollEmbed = new EmbedBuilder()
            .setTitle(lang.poll_embed_title
                .replace(/\${interaction\.user\.username}/g, user.globalName || user.username)
            )
            .setColor("#ddd98b")
            .setDescription(pollMessage)
            .addFields({ name: lang.poll_embed_fields_reaction, value: lang.poll_embed_fields_choice })
            .setImage("https://cdn.discordapp.com/attachments/610152915063013376/610947097969164310/loading-animation.gif")
            .setTimestamp()

        let msg = await client.method.interactionSend(interaction, { embeds: [pollEmbed] });

        await msg.react(client.iHorizon_Emojis.icon.Yes_Logo);
        await msg.react(client.iHorizon_Emojis.icon.No_Logo);

        return;
    },
};