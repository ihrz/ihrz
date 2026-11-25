/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from "discord.js";

import { utcTimezones } from "../locales.js";

/** Discord's limit of options in one select menu. */
export const SELECT_MAX_OPTIONS = 25;

const offsetLabel = (offset: number) =>
	offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;

/**
 * The time zone pickers of /nightmode: the 26 zones (UTC-11 to UTC+14) don't
 * fit in one menu (25 options at most, Discord refused the whole reply), so
 * west of UTC (up to UTC+0) and east of it get one menu each.
 */
export function utcSelectMenus(
	question: string,
	current: number | undefined,
	ids = { west: "utc_choice_west", east: "utc_choice_east" }
): StringSelectMenuBuilder[] {
	const zones = Object.entries(utcTimezones)
		.map(([offset, name]) => ({ offset: Number(offset), name }))
		.sort((a, b) => a.offset - b.offset);
	const menu = (id: string, part: typeof zones) =>
		new StringSelectMenuBuilder()
			.setCustomId(id)
			.setPlaceholder(
				`${question} (${offsetLabel(part[0]!.offset)} … ${offsetLabel(part[part.length - 1]!.offset)})`.slice(
					0,
					150
				)
			)
			.addOptions(
				part.map((z) =>
					new StringSelectMenuOptionBuilder()
						.setLabel(z.name)
						.setValue(String(z.offset))
						.setDescription(offsetLabel(z.offset))
						.setDefault(z.offset === current)
				)
			);
	return [
		menu(
			ids.west,
			zones.filter((z) => z.offset <= 0)
		),
		menu(
			ids.east,
			zones.filter((z) => z.offset > 0)
		)
	];
}
