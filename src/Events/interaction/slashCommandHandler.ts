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
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	CommandInteractionOptionResolver,
	EmbedBuilder,
	GuildMember,
	Interaction,
	Message,
	PermissionFlagsBits
} from "discord.js";
import { LanguageData } from "../../../types/languageData.js";
import { BotEvent } from "../../../types/event.js";
import { Command } from "../../../types/command.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getPermissionByValue } from "../../core/functions/permissonsCalculator.js";
import { blacklistTable, tempTable } from "../client/ready.js";
import { sanitizeInteractionOptionValue } from "../../core/functions/sanitizeInteractionOptionValue.js";
import logger from "../../core/logger.js";
import { Expressions } from "../../core/functions/randomExpression.js";

const timeout: number = 1000;

async function cooldDown(interaction: Interaction) {
	const tn = Date.now();
	const fetch = await tempTable.get(`COOLDOWN.${interaction.user.id}`);
	if (fetch !== null && timeout - (tn - fetch) > 0) return true;

	await tempTable.set(`COOLDOWN.${interaction.user.id}`, tn);
	return false;
}

export async function checkCommandRateLimit(
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	commandPath: string,
	lang: LanguageData
): Promise<boolean> {
	if (!interaction.guild) return false;

	if (
		(await client.func.ownerHelper.isBotOwner(
			interaction.member?.user!.id!
		)) ||
		(await client.func.ownerHelper.isGuildOwner(
			interaction.member?.user!.id!,
			interaction.guild!
		))
	)
		return false;

	let configuredLimit = (await client.db.get(
		`${interaction.guild!.id}.UTILS.COMMAND_LIMITS.${commandPath}`
	)) as DatabaseStructure.CommandRateLimit | undefined;

	if (!configuredLimit) {
		const category = commandPath.split(" ")[0];
		if (category !== commandPath) {
			configuredLimit = (await client.db.get(
				`${interaction.guild!.id}.UTILS.COMMAND_LIMITS.${category}`
			)) as DatabaseStructure.CommandRateLimit | undefined;
		}
	}

	if (
		!configuredLimit ||
		configuredLimit.count <= 0 ||
		configuredLimit.windowMs <= 0
	)
		return false;

	const rateLimitKey = `COMMAND_LIMITS.${interaction.guild!.id}.${commandPath}.${interaction.member!.user!.id!}`;
	const attempts = ((await tempTable.get(rateLimitKey)) || []) as number[];
	const now = Date.now();
	const activeAttempts = attempts.filter(
		(timestamp) => now - timestamp < configuredLimit.windowMs
	);

	if (activeAttempts.length >= configuredLimit.count) {
		const oldestAttempt = activeAttempts[0];
		const remainingTime = configuredLimit.windowMs - (now - oldestAttempt);

		await interaction.reply({
			content: lang.commandlimit_rate_limited.replace(
				"${time}",
				client.timeCalculator.to_beautiful_string(remainingTime, lang)
			),
			flags: [1 << 6]
		});
		return true;
	}

	activeAttempts.push(now);
	await tempTable.set(rateLimitKey, activeAttempts);
	return false;
}

async function handleCommandExecution(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached">,
	command: Command,
	lang: LanguageData,
	thinking: boolean
) {
	if (
		client.version.env === "production" &&
		interaction.commandName === "custom" &&
		![...interaction.entitlements.values()].some(
			(entitlement) => entitlement.skuId === "1512856902919258384"
		)
	) {
		return await client.func.method.interactionSend(interaction, {
			content: `${client.iHorizon_Emojis.Boost_Gem} https://discord.com/discovery/applications/945202900907470899/store`,
			embeds: [
				new EmbedBuilder()
					.setThumbnail(Expressions.Pleading)
					.setColor("Red")
					.setTitle(lang.custom_sdk_only_title)
					.setDescription(lang.custom_sdk_only_description)
			]
		});
	}

	const options = interaction.options as CommandInteractionOptionResolver;
	const group = options.getSubcommandGroup(false);
	const subCommand = options.getSubcommand(false);

	if (group && subCommand) {
		const stringCommand =
			interaction.commandName + " " + group + " " + subCommand;
		const subCmd = client.subCommands.get(stringCommand);

		if (subCmd && subCmd.run) {
			const permCheck =
				await client.func.permissonsCalculator.checkCommandPermission(
					interaction,
					stringCommand
				);
			if (
				!permCheck.allowed &&
				client.func.permissonsCalculator.hasCommandPermissionRequirements(
					permCheck.permissionData
				)
			) {
				return client.func.permissonsCalculator.sendErrorMessage(
					interaction,
					lang,
					permCheck.permissionData
				);
			}

			const isRateLimited = await checkCommandRateLimit(
				interaction,
				stringCommand,
				lang
			);
			if (isRateLimited) return;

			if (subCmd.thinking || thinking || subCmd.ephemeral) {
				await interaction.deferReply({
					flags: subCmd.ephemeral ? [1 << 6] : [0]
				});
			}

			if (
				subCmd.permission &&
				!interaction?.member?.permissions.has(subCmd.permission) &&
				!permCheck.allowed
			) {
				const perm = getPermissionByValue(subCmd.permission);

				if (perm) {
					let permName: string;
					if (Array.isArray(perm)) {
						// If it's an array of permissions, join their names
						permName = perm
							.filter(
								(p): p is NonNullable<typeof p> => p !== null
							)
							.map((p) => lang[p.name] || p.name)
							.join(", ");
					} else {
						// Single permission case
						permName = lang[perm.name] || perm.name;
					}
					const body = {
						content: lang.var_dont_have_perm.replace(
							"{perm}",
							permName
						)
					};
					return interaction.deferred
						? await interaction.editReply(body)
						: await interaction.reply(body);
				}
			}

			return await subCmd.run(client, interaction, lang, []);
		}
	} else if (subCommand) {
		const stringCommand = interaction.commandName + " " + subCommand;
		const subCmd = client.subCommands.get(stringCommand);

		if (subCmd && subCmd.run) {
			const permCheck =
				await client.func.permissonsCalculator.checkCommandPermission(
					interaction,
					stringCommand
				);
			if (
				!permCheck.allowed &&
				client.func.permissonsCalculator.hasCommandPermissionRequirements(
					permCheck.permissionData
				)
			) {
				return client.func.permissonsCalculator.sendErrorMessage(
					interaction,
					lang,
					permCheck.permissionData
				);
			}

			const isRateLimited = await checkCommandRateLimit(
				interaction,
				stringCommand,
				lang
			);
			if (isRateLimited) return;

			if (subCmd.thinking || thinking || subCmd.ephemeral) {
				await interaction.deferReply({
					flags: subCmd.ephemeral ? [1 << 6] : [0]
				});
			}

			if (
				subCmd.permission &&
				!interaction?.member?.permissions.has(subCmd.permission) &&
				!permCheck.allowed
			) {
				const perm = getPermissionByValue(subCmd.permission);

				if (perm) {
					let permName: string;
					if (Array.isArray(perm)) {
						// If it's an array of permissions, join their names
						permName = perm
							.filter(
								(p): p is NonNullable<typeof p> => p !== null
							)
							.map((p) => lang[p.name] || p.name)
							.join(", ");
					} else {
						// Single permission case
						permName = lang[perm.name] || perm.name;
					}
					const body = {
						content: lang.var_dont_have_perm.replace(
							"{perm}",
							permName
						)
					};
					return interaction.deferred
						? await interaction.editReply(body)
						: await interaction.reply(body);
				}
			}

			return await subCmd.run(client, interaction, lang, []);
		}
	}

	if (await checkCommandRateLimit(interaction, interaction.commandName, lang))
		return;

	if (command.thinking || command.ephemeral) {
		await interaction.deferReply({
			flags: command.ephemeral ? [1 << 6] : [0]
		});
	}

	const permCheck =
		await client.func.permissonsCalculator.checkCommandPermission(
			interaction,
			interaction.commandName
		);
	if (
		!permCheck.allowed &&
		client.func.permissonsCalculator.hasCommandPermissionRequirements(
			permCheck.permissionData
		)
	) {
		return client.func.permissonsCalculator.sendErrorMessage(
			interaction,
			lang,
			permCheck.permissionData
		);
	}

	if (
		command.permission &&
		!interaction.member!.permissions.has(command.permission) &&
		!permCheck.allowed
	) {
		const perm = getPermissionByValue(command.permission);

		if (perm) {
			let permName: string;
			if (Array.isArray(perm)) {
				// If it's an array of permissions, join their names
				permName = perm
					.filter((p): p is NonNullable<typeof p> => p !== null)
					.map((p) => lang[p.name] || p.name)
					.join(", ");
			} else {
				// Single permission case
				permName = lang[perm.name] || perm.name;
			}
			const body = {
				content: lang.var_dont_have_perm.replace("{perm}", permName)
			};
			return interaction.deferred
				? await interaction.editReply(body)
				: await interaction.reply(body);
		}
	}

	if (command.run) {
		(async () => {
			await command.run!(client, interaction, lang, []);
		})();
	}
}

async function handleCommandError(
	client: Client,
	interaction: ChatInputCommandInteraction,
	command: Command,
	error: any
) {
	const block = `\`\`\`TS\nMessage: The command ran into a problem!\nCommand Name: ${command.name}\nError: ${error}\`\`\`\n`;
	await client.func.method.interactionSend(interaction, {
		content:
			block +
			"**Let me suggest you to report this issue with `/report`.**"
	});

	const options = interaction.options as CommandInteractionOptionResolver;
	const optionsList = options["_hoistedOptions"].map(
		(element) =>
			`${element.name}:${sanitizeInteractionOptionValue(element.name, element.value)}`
	);

	let commandPath = interaction.commandName;
	const group = options.getSubcommandGroup(false);
	const subCommand = options.getSubcommand(false);

	if (group) commandPath += ` ${group}`;
	if (subCommand) commandPath += ` ${subCommand}`;
	if (optionsList.length) commandPath += ` ${optionsList.join(" ")}`;

	client.func.method.channelSend(client.config.core.reportChannelID, {
		embeds: [
			new EmbedBuilder()
				.setTitle(`SLASH_CMD_CRASH_NOT_HANDLE`)
				.setDescription(block)
				.setTimestamp()
				.setFields(
					{
						name: "🛡️ Bot Admin",
						value: interaction.guild?.members.me?.permissions.has(
							PermissionFlagsBits.Administrator
						)
							? "yes"
							: "no"
					},
					{
						name: "📝 User Admin",
						value: (
							interaction.member as GuildMember
						)?.permissions.has(PermissionFlagsBits.Administrator)
							? "yes"
							: "no"
					},
					{
						name: "** **",
						value: `/${commandPath}\n\n`
					}
				)
		]
	});
}

export const event: BotEvent = {
	name: "interactionCreate",
	run: async (client: Client, interaction: Interaction) => {
		if (interaction.isAutocomplete()) {
			const cmd = client.commands.get(interaction.commandName);
			if (cmd?.autocomplete) await cmd.autocomplete(client, interaction);
			return;
		}

		if (!interaction.isChatInputCommand() || interaction.user.bot) return;

		const command = client.commands?.get(interaction.commandName);
		if (!command) {
			return interaction.reply({
				content: "Connection error.",
				flags: [1 << 6]
			});
		}

		if (
			interaction.channel?.type === ChannelType.DM &&
			!command?.integration_types?.includes(1)
		) {
			return await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor(2829617)
						.setImage(await client.func.bannerGenerator(null))
						.setDescription(
							`# Uhh Oh!!\n\nIt seems you are using iHorizon in a private conversation.\nI want to clarify that iHorizon can only be used in a Discord server!\n\nTo unleash my full potential, add me!`
						)
				],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setEmoji(client.iHorizon_Emojis.Crown)
							.setLabel("Invite iHorizon")
							.setStyle(ButtonStyle.Link)
							.setURL(
								`https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot`
							),
						new ButtonBuilder()
							.setEmoji(client.iHorizon_Emojis.Sparkles)
							.setLabel("iHorizon Website")
							.setStyle(ButtonStyle.Link)
							.setURL("https://ihorizon.org")
					)
				]
			});
		}

		if (await cooldDown(interaction)) {
			const data = await client.func.getLanguageData(
				interaction.guild?.id
			);
			return await interaction.reply({
				content: data.Msg_cooldown,
				flags: [1 << 6]
			});
		}

		if (await blacklistTable.get(`${interaction.user.id}.blacklisted`)) {
			return await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor("#0827F5")
						.setTitle(":(")
						.setImage(client.config.core.blacklistPictureInEmbed)
				],
				flags: [1 << 6]
			});
		}

		try {
			const lang = await client.func.getLanguageData(interaction.guildId);
			await handleCommandExecution(
				client,
				interaction as ChatInputCommandInteraction<"cached">,
				command,
				lang,
				command.thinking
			);
		} catch (error) {
			logger.err(error);
			await handleCommandError(client, interaction, command, error);
		}
	}
};
