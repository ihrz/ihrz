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
	ActionRowBuilder,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	Message,
	StringSelectMenuBuilder
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import { acquireEconomyLock } from "../../../core/modules/economyLock.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	sendCard
} from "../../../core/modules/uiCard.js";
import { roleLines } from "../../../core/modules/economyCards.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const buyableRolesArray = Object.entries(
			await client.func.economyHelper.pruneBuyableRoles(interaction.guild)
		).map(([roleId, details]) => ({
			roleId,
			...details
		}));
		const baseData = ((await client.db.get(
			`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY`
		)) || {
			money: 0,
			bank: 0,
			ownedRoles: []
		}) as DatabaseStructure.EconomyUserSchema;
		const possibleBoost = await client.func.economyHelper.getMemberBoost(
			interaction.member!
		);

		baseData.money = baseData.money || 0;
		baseData.bank = baseData.bank || 0;
		baseData.ownedRoles = baseData.ownedRoles || [];

		if (buyableRolesArray.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_shop_not_set
			});
			return;
		}

		const buyableRoles = buyableRolesArray; // buyableRolesArray.filter((role) => !baseData.ownedRoles?.includes(role.roleId));

		const e = client.iHorizon_Emojis;
		const signature = await botSignature(client, interaction.guildId);
		const shopCard = () =>
			buildCard({
				accent: ACCENT.success,
				title: lang.economy_shop_embed_title.replace(
					"${guildName}",
					interaction.guild!.name
				),
				description: lang.economy_shop_embed_desc,
				thumbnail: interaction.guild!.iconURL({ size: 256 }),
				fields: [
					{
						emoji: e.Coin,
						label: lang.balance_embed_fields1_name,
						value: `${baseData.bank || 0}${e.Coin}`
					},
					{
						emoji: e.Wallet,
						label: lang.balance_embed_fields2_name,
						value: `${baseData.money || 0}${e.Coin}`
					},
					{
						emoji: e.Boost_Gem,
						label: lang.var_boost,
						value: `${possibleBoost}x`
					}
				],
				blocks: [
					roleLines(
						client,
						Object.fromEntries(
							buyableRoles.map(({ roleId, ...details }) => [
								roleId,
								details
							])
						),
						lang
					)
				],
				signature
			});
		const selectMenuOptions = buyableRoles.map((role) => ({
			label:
				interaction.guild?.roles.cache.get(role.roleId)?.name ||
				lang.economy_shop_unknown_role,
			value: role.roleId,
			description: baseData.ownedRoles?.includes(role.roleId)
				? lang.economy_shop_already_owned
				: `${lang.var_price}: ${role.price} 💰`
		}));

		// if there are no roles available for purchase
		if (selectMenuOptions.length === 0) {
			// check if already owned roles are not given to the user

			for (const roleId of baseData.ownedRoles || []) {
				if (!interaction.member.roles.cache.has(roleId)) {
					await interaction.member.roles.add(
						roleId,
						"[Economy Shop] Role was not given to the user."
					);
				}
			}

			await client.func.method.interactionSend(interaction, {
				content: lang.economy_shop_not_set
			});
			return;
		}

		// create a select menu
		const selectMenu = new StringSelectMenuBuilder()
			.addOptions(selectMenuOptions)
			.setCustomId("shop")
			.setPlaceholder(lang.economy_shop_menu_placeholder);

		const actionRow =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				selectMenu
			);

		const og_interaction = await sendCard(
			client,
			interaction,
			shopCard().addActionRowComponents(actionRow)
		);

		// create a collector
		const collector = og_interaction.createMessageComponentCollector({
			time: 600_000,
			componentType: ComponentType.StringSelect
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			const role = buyableRoles.find(
				(role) => role.roleId === i.values[0]
			);
			if (!role) {
				await i.reply({
					content: lang.economy_shop_not_available,
					flags: [1 << 6]
				});
				return;
			}

			const releaseLock = acquireEconomyLock(
				interaction.guildId!,
				interaction.member.id
			);
			if (!releaseLock) {
				await i.deferUpdate().catch(() => {});
				return;
			}

			try {
				// read the live account, the data loaded at open time may be stale
				const liveData = (await client.db.get(
					`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY`
				)) as DatabaseStructure.EconomyUserSchema | null;
				const liveMoney = liveData?.money ?? 0;
				const liveOwnedRoles = liveData?.ownedRoles ?? [];

				// check if the user already owns the role
				if (liveOwnedRoles.includes(role.roleId)) {
					if (!interaction.member.roles.cache.has(role.roleId)) {
						await interaction.member.roles
							.add(
								role.roleId,
								"[Economy Shop] Restored previously owned role."
							)
							.catch(() => {});
					}

					await i.reply({
						content: lang.economy_shop_already_own_role,
						flags: [1 << 6]
					});
					return;
				}

				// check if the user has enough money to purchase the role
				if (liveMoney < role.price) {
					await i.reply({
						content: lang.economy_shop_not_enough_money,
						flags: [1 << 6]
					});
					return;
				}

				// give the role first: a failure must not charge the member
				const roleAdded = await interaction.member.roles
					.add(
						role.roleId,
						"[Economy Module] Purchased from the shop"
					)
					.then(() => true)
					.catch(() => false);

				if (!roleAdded) {
					await i.reply({
						content: lang.economy_shop_role_add_failed,
						flags: [1 << 6]
					});
					return;
				}

				await client.db.sub(
					`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY.money`,
					role.price
				);
				await client.db.set(
					`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY.ownedRoles`,
					[...liveOwnedRoles, role.roleId]
				);
				baseData.ownedRoles = [...liveOwnedRoles, role.roleId];
			} finally {
				releaseLock();
			}

			const string_role_name =
				interaction.guild?.roles.cache.get(role.roleId)?.name ||
				lang.economy_shop_unknown_role;
			await i.reply({
				content: lang.economy_shop_role_purchased
					.replace("{roleName}", string_role_name)
					.replace("${rolePrice}", role.price.toString()),
				flags: [1 << 6]
			});
		});

		collector.on("end", async (_, reason) => {
			if (reason === "legit") return;
			const row =
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					selectMenu.setDisabled(true)
				);
			await og_interaction
				.edit(
					cardPayload(shopCard().addActionRowComponents(row)) as never
				)
				.catch(() => undefined);
		});
	}
};
