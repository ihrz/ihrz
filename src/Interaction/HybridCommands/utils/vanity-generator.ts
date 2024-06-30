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
} from 'pwss';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';
import { QuickDB } from 'quick.db';

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

export const command: Command = {

    name: 'vanity-generator',

    aliases: ["vanity", "vanity-gen", "customvanity"],

    description: 'Get your own vanity URL in discord.wf format!',
    description_localizations: {
        "fr": "Créer votre propre URL vanity sous le format discord.wf"
    },

    options: [
        {
            name: "code",

            description: "Vanity URL code",
            description_localizations: {
                "fr": "Le code du Vanity"
            },

            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (interaction instanceof ChatInputCommandInteraction) {
            var VanityCode = interaction.options.getString('code') as string;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var VanityCode = client.args.string(args!, 0) as string;
        };

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: data.renew_not_administrator });
        }

        let db = client.db.table('API');

        let get = await db.get('VANITY');

        let guildGet = get?.[`${interaction.guildId}`]?.['code'];

        if (!VerifyVanityCode(VanityCode)) {
            await client.args.interactionSend(interaction,{ content: `The URL Vanity code \`${VanityCode}\` is invalid. The string should be alphanumeric and can include hyphens between words. The maximum length is 32 characters. Hyphens cannot be at the beginning or end of the string.` });
            return;
        };

        if (await VanityCodeAlreadyExist(get, VanityCode)) {
            await client.args.interactionSend(interaction,{ content: `The URL Vanity code are already taked! Choose an another one` });
            return;
        };

        let guildInvite = await interaction.guild.invites.create((interaction.channel as TextChannel), { temporary: false, reason: "iHorizon - VanityGenerator", maxAge: 0 });

        if (guildGet) {
            await client.args.interactionSend(interaction,{ content: `The URL Vanity code \`${guildGet}\` have been overwrited for \`${VanityCode}\`. The guild is now joinable at: https://discord.wf/${VanityCode}` });
            await db.set(`VANITY.${interaction.guildId}`, { vanity: VanityCode, invite: guildInvite?.code });
            return;
        } else {
            await client.args.interactionSend(interaction,{ content: `The guild is now joinable at: https://discord.wf/${VanityCode}` });
            await db.set(`VANITY.${interaction.guildId}`, { vanity: VanityCode, invite: guildInvite?.code });
            return;
        };
    },
};