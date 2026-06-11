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

let baseUrl = "https://www.ihorizon.org";

export const Expressions = Object.freeze({
	Blushed: baseUrl + "/assets/img/bot/expression/ihorizon_blushed.png",
	Grimacing: baseUrl + "/assets/img/bot/expression/ihorizon_grimacing.png",
	Grin: baseUrl + "/assets/img/bot/expression/ihorizon_grin.png",
	Nerd: baseUrl + "/assets/img/bot/expression/ihorizon_nerd.png",
	Overhappy: baseUrl + "/assets/img/bot/expression/ihorizon_overhappy.png",
	Pleading: baseUrl + "/assets/img/bot/expression/ihorizon_pleading.png",
	Sob: baseUrl + "/assets/img/bot/expression/ihorizon_sob.png",
	Sunglass: baseUrl + "/assets/img/bot/expression/ihorizon_sunglass.png",
	Thinking: baseUrl + "/assets/img/bot/expression/ihorizon_thinking.png",
	Wink: baseUrl + "/assets/img/bot/expression/ihorizon_wink.png"
});

export const botExpressions = Object.values(Expressions);

export default function randomExpression(): string {
	return botExpressions[Math.floor(Math.random() * botExpressions.length)];
}
