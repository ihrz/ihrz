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
    PermissionsBitField,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    GuildChannel,
    EmbedBuilder,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;



        let user = interaction.options.getUser('user') as User;
        let perm = interaction.options.getString('permission') as string;

        if (perm === "0") {
            await client.db.delete(`${interaction.guildId}.UTILS.USER_PERMS.${user.id}`);

            await client.func.method.interactionSend(interaction, {
                content: lang.perm_set_deleted.replace("${user.toString()}", user.toString())
            });
        } else {
            let fetchedPerm = await client.func.permissonsCalculator.checkUserPermissions(
                interaction.member,
            );

            // @ts-ignore
            if (Array.isArray(fetchedPerm) ? false : fetchedPerm <= parseInt(perm) && interaction.guild.ownerId !== interaction.member.id) {
                await client.func.method.interactionSend(interaction, {
                    content: lang.perm_set_warn_message.replace(
                        "${interaction.member.toString()}",
                        interaction.member.toString(),
                    ),
                });
                return;
            }

            await client.db.set(`${interaction.guildId}.UTILS.USER_PERMS.${user.id}`, parseInt(perm));

            await client.func.method.interactionSend(interaction, {
                content: lang.perm_set_ok.replace("${user.toString()}", user.toString())
                    .replace("${perm}", perm)
            });
        }

        return;
    },
};