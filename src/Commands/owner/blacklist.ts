/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    Client,
    EmbedBuilder,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'blacklist',
    description: 'Add a user to the blacklist!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to blacklist...',
            required: false
        }
    ],
    category: 'owner',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (await client.db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`) !== true) {
            await interaction.editReply({ content: data.blacklist_not_owner });
            return;
        };

        var text = "";
        let char = await client.db.get(`GLOBAL.BLACKLIST`);

        for (var i in char) {
            text += `<@${i}>\n`;
        };

        let embed = new EmbedBuilder()
            .setColor('#2E2EFE').setAuthor({ name: 'Blacklist' }).setDescription(text || "No blacklist")
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

        let member = interaction.options.getMember('user');
        let user = interaction.options.getUser('user');

        if (!member && !user) {
            await interaction.editReply({ embeds: [embed] });
            return;
        };

        if (member) {
            if (member.user.id === client.user?.id) {
                await interaction.editReply({ content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await client.db.get(`GLOBAL.BLACKLIST.${member.user.id}`);

            if (!fetched) {
                await client.db.set(`GLOBAL.BLACKLIST.${member.user.id}`, { blacklisted: true });

                if (member.bannable) {
                    member.ban({ reason: "blacklisted !" });
                    await interaction.editReply({ content: data.blacklist_command_work.replace(/\${member\.user\.username}/g, member.user.globalName) });
                    return;
                } else {
                    await client.db.set(`GLOBAL.BLACKLIST.${member.user.id}`, { blacklisted: true });
                    await interaction.editReply({ content: data.blacklist_blacklisted_but_can_ban_him });
                    return;
                }
            } else {
                await interaction.editReply({ content: data.blacklist_already_blacklisted.replace(/\${member\.user\.username}/g, member.user.globalName) });
                return;
            }
        } else if (user) {

            if (user.id === client.user?.id) {
                await interaction.editReply({ content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await client.db.get(`GLOBAL.BLACKLIST.${user.id}`);

            if (!fetched) {
                await client.db.set(`GLOBAL.BLACKLIST.${user.id}`, { blacklisted: true });

                await interaction.editReply({ content: data.blacklist_command_work.replace(/\${member\.user\.username}/g, user.globalName) }); return;
            } else {
                await interaction.editReply({ content: data.blacklist_already_blacklisted.replace(/\${member\.user\.username}/g, user.globalName) });
                return;
            }
        };
    },
};