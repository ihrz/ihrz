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
    Application,
    ApplicationCommand,
    ApplicationCommandType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    PermissionFlagsBits,
    RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';

import { Option } from "./option.js";
import type { LanguageData } from './languageData.js';

export interface NameLocalizations {
    "fr": string;
}

export interface DescriptionLocalizations {
    "fr": string;
}

export interface Command {
    name: string;
    prefixName?: string;
    description: string;
    name_localizations?: NameLocalizations;
    description_localizations: DescriptionLocalizations;
    integration_types?: number[],
    contexts?: number[],
    permission: bigint | 0 | null;
    category: string;
    options?: Option[];
    thinking: boolean;
    ephemeral?: boolean;
    channel_types?: number[];
    type: ApplicationCommandType | 'PREFIX_IHORIZON_COMMAND';
    aliases?: string[];
    autocomplete?(client: Client, interaction: AutocompleteInteraction): Promise<any>;
    run?(client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]): Promise<any>;
}

export interface SubCommand {
    run(client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]): Promise<any>;
}

export interface SubCommandModule {
    subCommand: SubCommand
}