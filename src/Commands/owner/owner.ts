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
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'owner',
    description: 'add user to owner list (can\'t be used by normal member)!',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member you want to made owner of the iHorizon Projects',
            required: false
        }
    ],
    thinking: false,
    category: 'owner',
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id);

        var text = "";
        var char = await client.db.get(`GLOBAL.OWNER`);

        for (var i in char) {
            text += `<@${i}>\n`
        };

        if (!text.includes(interaction.user.id)) {
            await interaction.reply({ content: data.owner_not_owner });
            return;
        };

        let iconURL = client.user?.displayAvatarURL();

        let embed = new EmbedBuilder()
            .setColor("#2E2EFE")
            .setAuthor({ name: "Owners" })
            .setDescription(text)
            .setFooter({ text: 'iHorizon', iconURL: iconURL });

        let member = interaction.options.getMember('member') as GuildMember;

        if (!member) {
            await interaction.reply({ embeds: [embed] });
            return;
        };

        let checkAx = await client.db.get(`GLOBAL.OWNER.${member.id}.owner`);

        if (checkAx) {
            await interaction.reply({ content: data.owner_already_owner });
            return;
        };

        await client.db.set(`GLOBAL.OWNER.${member.user.id}.owner`, true);
        await interaction.reply({ content: data.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.user.globalName) });
        return;
    },
};