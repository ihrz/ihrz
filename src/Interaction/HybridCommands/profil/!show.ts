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
    time,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getUser("user") as User || interaction.user;
        } else {

            var member = await client.func.method.user(interaction, args!, 0) || interaction.author;
        };

        let tableProfil = client.db.table('USER_PROFIL');

        var description = await tableProfil.get(`${member.id}.desc`);
        if (!description) description = lang.profil_not_description_set;

        var level = await client.db.get(`${interaction.guildId}.USER.${member.id}.XP_LEVELING.level`);
        if (!level) level = 0;

        var balance = await client.db.get(`${interaction.guildId}.USER.${member.id}.ECONOMY.money`);
        if (!balance) balance = 0;

        var age = await tableProfil.get(`${member.id}.age`);
        if (!age) age = lang.profil_unknown;

        var gender = await tableProfil.get(`${member.id}.gender`);
        if (!gender) gender = lang.profil_unknown;

        var pronoun = await tableProfil.get(`${member.id}.pronoun`);
        if (!pronoun) pronoun = lang.profil_unknown;

        var birthday = await tableProfil.get(`${member.id}.birthday`);
        if (!birthday) birthday = lang.profil_unknown;

        // convert birthday to timestamp and transform timestamp to discord timestamp
        birthday = time(new Date(new Date().getFullYear(), parseInt(birthday.month) - 1, parseInt(birthday.day)), 'R');

        let profil = new EmbedBuilder()
            .setTitle(lang.profil_embed_title
                .replace(/\${member\.tag}/g, member.username)
                .replace('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
            )
            .setDescription(`\`${description}\``)
            .addFields(
                { name: lang.profil_embed_fields_nickname, value: member.username, inline: false },
                { name: lang.profil_embed_fields_money, value: balance + lang.profil_embed_fields_money_value, inline: false },
                { name: lang.profil_embed_fields_xplevels, value: level + lang.profil_embed_fields_xplevels_value, inline: false },
                { name: lang.profil_embed_fields_age, value: age + lang.profil_embed_fields_age_value, inline: false },
                { name: lang.profil_embed_fields_gender, value: gender, inline: false },
                { name: lang.profil_embed_fields_pronouns, value: pronoun.replace("-", "/"), inline: false },
                { name: lang.profil_embed_fields_birthdate, value: birthday, inline: false },
            )
            .setColor("#ffa550")
            .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 1024 }))
            .setTimestamp()
            .setFooter(await client.func.displayBotName.footerBuilder(interaction))

        await client.func.method.interactionSend(interaction, {
            embeds: [profil],
            files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};