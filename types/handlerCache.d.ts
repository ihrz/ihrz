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

import { Client } from "discord.js";

export namespace handlerCache {
	export const components_button: Record<string, any>;
	export const core_functions: Record<string, any>;
	export const components_select_menu: Record<string, any>;
	export const MessageApplicationCommands: Record<string, any>;
	export const UserApplicationCommands: Record<string, any>;
	export const slash: Record<string, any>;
	export const subCommands: Record<string, any>;
	export const hybrid: Record<string, any>;
	export const hybridSubCommands: Record<string, any>;
	export const events: Record<string, any>;
	export const MessageCommands: Record<string, any>;
	export const bash: Record<string, any>;
	export const html_files: Record<string, string>
	export function initializeSubCommands(client: any): void;
	export function initializeHybridCommands(client: any): void;
	export function processOptions(options: any[], category: string, parentName: string, client: Client): void;
	export function stringifyOption(options: any[]): string;
	export function hasSubCommand(options: any[]): boolean;
	export function hasSubCommandGroup(options: any[]): boolean;
	export function isSubCommand(option: any): boolean;
}
