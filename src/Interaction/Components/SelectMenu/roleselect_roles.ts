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

import { StringSelectMenuInteraction } from 'discord.js';

export default async function (interaction: StringSelectMenuInteraction<"cached">) {
    let baseData = await interaction.client.db.get(`${interaction.guildId}.GUILD.ROLE_SELECT.${interaction.message.id}`);
    if (!baseData) return;

    const role = (interaction.values[0]).split("_")[1];

    const lang = await interaction.client.func.getLanguageData(interaction.guildId);

    let fetched_role = interaction.guild.roles.cache.get(role) || await interaction.guild.roles.fetch(role).catch(() => null);

    if (!fetched_role) {
        await interaction.reply({
            content: lang.buttonreaction_role_doesnt_exit,
            ephemeral: true
        })
    } else if (fetched_role.rawPosition >= Number(interaction.guild.members.me?.roles.highest.rawPosition)) {
        await interaction.reply({
            content: lang.buttonreaction_role_too_high,
            ephemeral: true
        })
    } else {
        if (interaction.member.roles.cache.has(fetched_role.id)) {
            await interaction.member.roles.remove(fetched_role.id);
            await interaction.reply({
                content: lang.buttonreaction_role_add
                    .replace("${fetched_role.toString()}", fetched_role.toString()),
                ephemeral: true
            });
        } else {
            await interaction.member.roles.add(fetched_role.id);
            await interaction.reply({
                content: lang.buttonreaction_role_remove
                    .replace("${fetched_role.toString()}", fetched_role.toString()),
                ephemeral: true
            });
        }
    }
    return;
};