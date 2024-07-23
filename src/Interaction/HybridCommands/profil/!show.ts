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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    User,
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/arg';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("user") as GuildMember || interaction.member;
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var member = client.method.member(interaction, args!, 0) || interaction.member;
        };

        let tableProfil = client.db.table('USER_PROFIL');

        var description = await tableProfil.get(`${member.id}.desc`);
        if (!description) description = data.profil_not_description_set;

        var level = await client.db.get(`${interaction.guildId}.USER.${member.id}.XP_LEVELING.level`);
        if (!level) level = 0;

        var balance = await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY.money`);
        if (!balance) balance = 0;

        var age = await tableProfil.get(`${member.id}.age`);
        if (!age) age = data.profil_unknown;

        var gender = await tableProfil.get(`${member.id}.gender`);
        if (!gender) gender = data.profil_unknown;

        let profil = new EmbedBuilder()
            .setTitle(data.profil_embed_title
                .replace(/\${member\.tag}/g, member.user.username)
                .replace('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
            )
            .setDescription(`\`${description}\``)
            .addFields(
                { name: data.profil_embed_fields_nickname, value: member.user.username, inline: false },
                { name: data.profil_embed_fields_money, value: balance + data.profil_embed_fields_money_value, inline: false },
                { name: data.profil_embed_fields_xplevels, value: level + data.profil_embed_fields_xplevels_value, inline: false },
                { name: data.profil_embed_fields_age, value: age + data.profil_embed_fields_age_value, inline: false },
                { name: data.profil_embed_fields_gender, value: `${gender}`, inline: false })
            .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#ffa550")
            .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 512 }))
            .setTimestamp()
            .setFooter(await client.method.bot.footerBuilder(interaction))

        await client.method.interactionSend(interaction, {
            embeds: [profil],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};