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

import { LanguageData } from "../../../types/languageData.js";

export class iHorizonTimeCalculator {
	to_ms(timeString: string): number {
		timeString = timeString.replace(" ", "");
		const regex = /(-?\d*\.?\d+)([a-zA-Z]+)/g;

		const multipliers: Record<string, number> = {
			ms: 1,
			msec: 1,
			millisecond: 1,
			milliseconds: 1,
			milliseconde: 1,
			millisecondes: 1,
			s: 1000,
			sec: 1000,
			secs: 1000,
			second: 1000,
			seconds: 1000,
			seconde: 1000,
			secondes: 1000,
			m: 60000,
			min: 60000,
			mins: 60000,
			minute: 60000,
			minutes: 60000,
			h: 3600000,
			hr: 3600000,
			hrs: 3600000,
			hour: 3600000,
			hours: 3600000,
			heure: 3600000,
			heures: 3600000,
			d: 86400000,
			day: 86400000,
			days: 86400000,
			j: 86400000,
			jour: 86400000,
			jours: 86400000,
			w: 604800000,
			sm: 604800000,
			week: 604800000,
			weeks: 604800000,
			semaine: 604800000,
			semaines: 604800000,
			mo: 2592000000,
			mois: 2592000000,
			month: 2592000000,
			months: 2592000000,
			y: 31557600000,
			yr: 31557600000,
			yrs: 31557600000,
			year: 31557600000,
			years: 31557600000,
			an: 31557600000,
			ans: 31557600000
		};

		return [...timeString.matchAll(regex)].reduce((total, match) => {
			const value = parseFloat(match[1]);
			const unit = match[2].toLowerCase();
			return total + value * (multipliers[unit] ?? 0);
		}, 0);
	}

	to_beautiful_string(
		timeStringOrMs: string | number,
		lang: LanguageData,
		options?: { long?: boolean }
	): string {
		let milliseconds: number;

		if (typeof timeStringOrMs === "string") {
			milliseconds = this.to_ms(timeStringOrMs)!;
		} else if (typeof timeStringOrMs === "number") {
			milliseconds = timeStringOrMs;
		} else {
			throw new Error("Invalid input");
		}

		const longFormat = options?.long;

		const timeUnits = [
			{
				unit: "y",
				factor: 31557600000,
				longName: "year",
				shortName: lang ? lang.var_year : "y"
			},
			{
				unit: "mo",
				factor: 2592000000,
				longName: "month",
				shortName: lang ? lang.var_mo : "mo"
			},
			{
				unit: "w",
				factor: 604800000,
				longName: "week",
				shortName: lang ? lang.var_w : "w"
			},
			{
				unit: "d",
				factor: 86400000,
				longName: "day",
				shortName: lang ? lang.var_d : "d"
			},
			{
				unit: "h",
				factor: 3600000,
				longName: "hour",
				shortName: lang ? lang.var_h : "h"
			},
			{
				unit: "m",
				factor: 60000,
				longName: "minute",
				shortName: lang ? lang.var_m : "m"
			},
			{
				unit: "s",
				factor: 1000,
				longName: "second",
				shortName: lang ? lang.var_s : "s"
			},
			{ unit: "ms", factor: 1, longName: "millisecond", shortName: "ms" } // ← ajout
		];

		let result = "";
		for (const { unit, factor, longName, shortName } of timeUnits) {
			if (milliseconds >= factor) {
				const value = Math.floor(milliseconds / factor);
				result += `${value}${longFormat ? " " + longName + (value > 1 ? "s" : "") : shortName}`;
				milliseconds %= factor;
				if (milliseconds > 0) {
					result += longFormat ? " " : "";
				} else {
					break;
				}
			}
		}

		return result === "" ? "0" + (lang ? lang.var_m : "m") : result.trim();
	}
}
