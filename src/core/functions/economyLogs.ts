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

import { BaseGuildTextChannel, EmbedBuilder, Guild, GuildBasedChannel } from "discord.js";
import { LanguageData } from "../../../types/languageData";

async function getEconomyChannel(guild: Guild): Promise<GuildBasedChannel | null> {
	const channelId = await client.db.get(`${guild.id}.GUILD.SERVER_LOGS.economy`);
	if (!channelId) return null;

	return guild.channels.cache.get(channelId)
		|| await guild.channels.fetch(channelId).catch(() => null);
}

function sendEmbed(channel: BaseGuildTextChannel, title: string, description: string): void {
	const embed = new EmbedBuilder()
		.setColor("#f1c232")
		.setTitle(title)
		.setDescription(description)
		.setTimestamp();

	channel.send({ embeds: [embed] });
}

export async function addMoney(guild: Guild, author: string, target: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_add_money_title,
		lang.economy_logs_add_money_desc
			.replace("{author}", `<@${author}>`)
			.replace("{target}", `<@${target}>`)
			.replace("{amount}", amount.toString())
			.replace("{coin}", client.iHorizon_Emojis.Coin)
	);
}

export async function removeMoney(guild: Guild, author: string, target: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_remove_money_title,
		lang.economy_logs_remove_money_desc
			.replace("{author}", `<@${author}>`)
			.replace("{target}", `<@${target}>`)
			.replace("{amount}", amount.toString())
			.replace("{coin}", client.iHorizon_Emojis.Coin)
	);
}

export async function boostModifying(guild: Guild, author: string, role: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_boost_role_title,
		lang.economy_logs_boost_role_desc
			.replace("{author}", `<@${author}>`)
			.replace("{role}", `<@&${role}>`)
			.replace("{amount}", amount.toString())
	);
}

export async function config(guild: Guild, author: string, target: "on" | "off", lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_config_title,
		lang.economy_logs_config_desc
			.replace("{author}", `<@${author}>`)
			.replace("{state}", lang[`var_${target}`])
	);
}

export async function roleAdd(guild: Guild, author: string, role: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_role_add_title,
		lang.economy_logs_role_add_desc
			.replace("{author}", `<@${author}>`)
			.replace("{role}", `<@&${role}>`)
			.replace("{amount}", amount.toString())
	);
}

export async function roleDelete(guild: Guild, author: string, role: string, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_role_remove_title,
		lang.economy_logs_role_remove_desc
			.replace("{author}", `<@${author}>`)
			.replace("{role}", `<@&${role}>`)
	);
}

export async function pay(guild: Guild, author: string, target: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_pay_title,
		lang.economy_logs_pay_desc
			.replace("{author}", `<@${author}>`)
			.replace("{target}", `<@${target}>`)
			.replace("{amount}", amount.toString())
	);
}

export async function rob(guild: Guild, author: string, target: string, amount: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_rob_title,
		lang.economy_logs_rob_desc
			.replace("{author}", `<@${author}>`)
			.replace("{target}", `<@${target}>`)
			.replace("{amount}", amount.toString())
	);
}

export async function setCooldown(guild: Guild, author: string, time: string, type: string, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_set_cooldown_title,
		lang.economy_logs_set_cooldown_desc
			.replace("{author}", `<@${author}>`)
			.replace("{type}", type.toUpperCase())
			.replace("{time}", time)
	);
}

export async function setMoney(guild: Guild, author: string, money: number, type: string, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_set_money_title,
		lang.economy_logs_set_money_desc
			.replace("{author}", `<@${author}>`)
			.replace("{type}", type.toUpperCase())
			.replace("{money}", money.toString())
	);
}

export async function withdraw(guild: Guild, author: string, money: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_withdraw_title,
		lang.economy_logs_withdraw_desc
			.replace("{author}", `<@${author}>`)
			.replace("{money}", money.toString())
	);
}

export async function deposit(guild: Guild, author: string, money: number, lang: LanguageData): Promise<void> {
	const channel = await getEconomyChannel(guild);
	if (!channel) return;

	sendEmbed(
		channel as BaseGuildTextChannel,
		lang.economy_logs_deposit_title,
		lang.economy_logs_deposit_desc
			.replace("{author}", `<@${author}>`)
			.replace("{money}", money.toString())
	);
}
