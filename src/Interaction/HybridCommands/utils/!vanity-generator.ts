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
    EmbedBuilder,
    CommandInteraction,
    ApplicationCommandType,
    ChannelType,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    TextChannel,
    Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

function VerifyVanityCode(VanityCode: string) {
    if (VanityCode.length > 32) {
        return false;
    }
    const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/i;
    if (!regex.test(VanityCode)) {
        return false;
    }

    return true;
}

async function VanityCodeAlreadyExist(AllVanityGuild: any, code: string): Promise<boolean> {
    let _ = false;
    for (let guildId in AllVanityGuild) {
        if (AllVanityGuild[guildId]?.vanity === code) _ = true;
    }
    return _;
}

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var VanityCode = interaction.options.getString('code') as string;
        } else {
            
            var VanityCode = client.func.method.string(args!, 0) as string;
        };

        let db = client.db.table('API');

        let get = await db.get('VANITY');

        let guildGet = get?.[`${interaction.guildId}`]?.['code'];

        if (!VerifyVanityCode(VanityCode)) {
            await client.func.method.interactionSend(interaction, { content: `The URL Vanity code \`${VanityCode}\` is invalid. The string should be alphanumeric and can include hyphens between words. The maximum length is 32 characters. Hyphens cannot be at the beginning or end of the string.` });
            return;
        };

        if (await VanityCodeAlreadyExist(get, VanityCode)) {
            await client.func.method.interactionSend(interaction, { content: `The URL Vanity code are already taked! Choose an another one` });
            return;
        };

        let guildInvite = await interaction.guild.invites.create((interaction.channel as TextChannel), { temporary: false, reason: "iHorizon - VanityGenerator", maxAge: 0 });

        if (guildGet) {
            await client.func.method.interactionSend(interaction, { content: `The URL Vanity code \`${guildGet}\` have been overwrited for \`${VanityCode}\`. The guild is now joinable at: https://discord.wf/${VanityCode}` });
            await db.set(`VANITY.${interaction.guildId}`, { vanity: VanityCode, invite: guildInvite?.code });
            return;
        } else {
            await client.func.method.interactionSend(interaction, { content: `The guild is now joinable at: https://discord.wf/${VanityCode}` });
            await db.set(`VANITY.${interaction.guildId}`, { vanity: VanityCode, invite: guildInvite?.code });
            return;
        };
    },
};