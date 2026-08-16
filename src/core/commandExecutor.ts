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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	GuildMember,
	Message,
	PermissionFlagsBits
} from "discord.js";
import { LanguageData } from "../../types/languageData.js";
import { Command } from "../../types/command";
import { getPermissionByValue } from "./functions/permissonsCalculator.js";
import { Expressions } from "./functions/randomExpression.js";
import { tempTable } from "../Events/client/ready.js";
import { Option } from "../../types/option.js";

export type CommandSource = Message | ChatInputCommandInteraction<"cached">;

export function isInteractionSource(
	source: CommandSource
): source is ChatInputCommandInteraction<"cached"> {
	return "isChatInputCommand" in source;
}

export interface ExecutionContext {
	client: Client;
	source: CommandSource;
	lang: LanguageData;
	command: Command;
	target: Command;
	args: string[];
	commandPath: string;
}

export function getGuildId(source: CommandSource): string {
	return source.guildId!;
}

export function getUserId(source: CommandSource): string {
	return isInteractionSource(source) ? source.user.id : source.author.id;
}

export async function getMember(
	source: CommandSource
): Promise<GuildMember | null> {
	if (isInteractionSource(source)) {
		return (source.member as GuildMember) ?? null;
	}
	return (
		source.member ??
		(await source.guild?.members
			.fetch(source.author.id)
			.catch(() => null)) ??
		null
	);
}

async function replyDenied(ctx: ExecutionContext, content: string) {
	if (isInteractionSource(ctx.source)) {
		const body = { content };
		if (ctx.source.deferred || ctx.source.replied) {
			await ctx.source.editReply(body);
		} else {
			await ctx.source.reply(body);
		}
		return;
	}
	await ctx.source.reply({ content });
}

async function deferIfNeeded(ctx: ExecutionContext) {
	if (!isInteractionSource(ctx.source)) return;
	if (ctx.source.deferred || ctx.source.replied) return;

	const command = ctx.command as any;
	const target = ctx.target as any;
	const isSubCommand = ctx.target !== ctx.command;
	const shouldDefer = isSubCommand
		? target.thinking || command.thinking || target.ephemeral
		: command.thinking || command.ephemeral;
	const ephemeral = isSubCommand ? target.ephemeral : command.ephemeral;

	if (shouldDefer) {
		await ctx.source.deferReply({
			flags: ephemeral ? [1 << 6] : [0]
		});
	}
}

function formatPermissionName(
	lang: LanguageData,
	permission: unknown
): string | null {
	const perm = getPermissionByValue(permission as any);
	if (!perm) return null;

	if (Array.isArray(perm)) {
		return perm
			.filter((p): p is NonNullable<typeof p> => p !== null)
			.map((p) => lang[p.name] || p.name)
			.join(", ");
	}
	return lang[perm.name] || perm.name;
}

async function checkCustomSdkGate(ctx: ExecutionContext): Promise<boolean> {
	if (
		ctx.client.version.env !== "production" ||
		ctx.command.name !== "custom" ||
		ctx.command.description.startsWith("Change the iHorizon")
	) {
		return true;
	}

	const userId = getUserId(ctx.source);
	if (await ctx.client.func.ownerHelper.isBotOwner(userId)) return true;

	const guildId = getGuildId(ctx.source);
	if (await hasGuildSku(ctx.client, guildId, "1512856902919258384")) {
		return true;
	}

	await ctx.client.func.method.interactionSend(ctx.source, {
		content: `${ctx.client.iHorizon_Emojis.Boost_Gem} https://discord.com/discovery/applications/945202900907470899/store`,
		embeds: [
			new EmbedBuilder()
				.setThumbnail(Expressions.Pleading)
				.setColor("Red")
				.setTitle(ctx.lang.custom_sdk_only_title)
				.setDescription(ctx.lang.custom_sdk_only_description)
		]
	});
	return false;
}

export async function hasGuildSku(
	client: Client,
	guildId: string,
	skuId: string
): Promise<boolean> {
	const { Routes } = await import("discord-api-types/v10");
	const entitlements = (await client.rest.get(
		Routes.entitlements(client.user!.id)
	)) as {
		id: string;
		sku_id: string;
		guild_id?: string;
		deleted?: boolean;
	}[];

	return entitlements.some(
		(entitlement) =>
			entitlement.guild_id === guildId &&
			entitlement.sku_id === skuId &&
			!entitlement.deleted
	);
}

async function checkGuildPermissionRequirements(
	ctx: ExecutionContext
): Promise<{ passed: boolean; allowed: boolean }> {
	const permCheck =
		await ctx.client.func.permissonsCalculator.checkCommandPermission(
			ctx.source,
			ctx.commandPath
		);

	if (
		!permCheck.allowed &&
		ctx.client.func.permissonsCalculator.hasCommandPermissionRequirements(
			permCheck.permissionData
		)
	) {
		await ctx.client.func.permissonsCalculator.sendErrorMessage(
			ctx.source,
			ctx.lang,
			permCheck.permissionData
		);
		return { passed: false, allowed: permCheck.allowed };
	}

	return { passed: true, allowed: permCheck.allowed };
}

async function checkNativePermission(
	ctx: ExecutionContext,
	alreadyAllowed: boolean
): Promise<boolean> {
	const target = ctx.target;
	if (!target.permission || alreadyAllowed) return true;

	const member = await getMember(ctx.source);
	if (member?.permissions.has(target.permission)) return true;

	const permName = formatPermissionName(ctx.lang, target.permission);
	if (!permName) return true;

	await replyDenied(
		ctx,
		ctx.lang.var_dont_have_perm.replace("{perm}", permName)
	);
	return false;
}

const RATE_LIMIT_DEBOUNCE_MS = 1000;

async function interactionCooldown(interaction: ChatInputCommandInteraction) {
	const now = Date.now();
	const last = await tempTable.get(`COOLDOWN.${interaction.user.id}`);
	if (last !== null && RATE_LIMIT_DEBOUNCE_MS - (now - last) > 0) return true;

	await tempTable.set(`COOLDOWN.${interaction.user.id}`, now);
	return false;
}

export async function checkCommandRateLimit(
	ctx: ExecutionContext
): Promise<boolean> {
	const { client, source: interaction, lang, commandPath } = ctx;
	if (!interaction.guild) return false;

	if (
		await client.func.ownerHelper.isGuildOwner(
			getUserId(interaction),
			interaction.guild
		)
	) {
		return false;
	}

	let configuredLimit = await client.db.get(
		`${interaction.guild.id}.UTILS.COMMAND_LIMITS.${commandPath}`
	);

	if (!configuredLimit) {
		const category = commandPath.split(" ")[0];
		if (category !== commandPath) {
			configuredLimit = await client.db.get(
				`${interaction.guild.id}.UTILS.COMMAND_LIMITS.${category}`
			);
		}
	}

	if (
		!configuredLimit ||
		configuredLimit.count <= 0 ||
		configuredLimit.windowMs <= 0
	) {
		return false;
	}

	const rateLimitKey = `COMMAND_LIMITS.${interaction.guild.id}.${commandPath}.${getUserId(interaction)}`;
	const attempts = ((await tempTable.get(rateLimitKey)) || []) as number[];
	const now = Date.now();
	const activeAttempts = attempts.filter(
		(timestamp) => now - timestamp < configuredLimit.windowMs
	);

	if (activeAttempts.length >= configuredLimit.count) {
		const oldestAttempt = activeAttempts[0];
		const remainingTime = configuredLimit.windowMs - (now - oldestAttempt);

		await replyDenied(
			ctx,
			lang.commandlimit_rate_limited.replace(
				"${time}",
				client.timeCalculator.to_beautiful_string(remainingTime, lang)
			)
		);
		return true;
	}

	activeAttempts.push(now);
	await tempTable.set(rateLimitKey, activeAttempts);
	return false;
}

export async function preExecutionCooldown(
	client: Client,
	source: CommandSource
): Promise<boolean> {
	if (isInteractionSource(source)) {
		return interactionCooldown(source);
	}
	return client.func.helper.cooldown(source.author.id, "msg_commands", 1000);
}

async function handleExecutionError(ctx: ExecutionContext, error: any) {
	const interaction = isInteractionSource(ctx.source);
	const errorBlock = `\`\`\`TS\nMessage: The command ran into a problem!\nCommand Name: ${ctx.target.name}\nError: ${error}\`\`\`\n`;

	if (interaction) {
		await ctx.client.func.method.interactionSend(ctx.source, {
			content:
				errorBlock +
				"**Let me suggest you to report this issue with `/report`.**"
		});
	}

	const member = await getMember(ctx.source);
	const lastField = interaction
		? { name: "** **", value: `/${ctx.commandPath}\n\n` }
		: { name: "** **", value: (ctx.source as Message).content };

	await ctx.client.func.method.channelSend(
		ctx.client.config.core.reportChannelID,
		{
			embeds: [
				new EmbedBuilder()
					.setTitle(
						interaction
							? "SLASH_CMD_CRASH_NOT_HANDLE"
							: "MSG_CMD_CRASH_NOT_HANDLE"
					)
					.setDescription(errorBlock)
					.setTimestamp()
					.setFields(
						{
							name: "🛡️ Bot Admin",
							value: ctx.source.guild?.members.me?.permissions.has(
								PermissionFlagsBits.Administrator
							)
								? "yes"
								: "no"
						},
						{
							name: "📝 User Admin",
							value: member?.permissions.has(
								PermissionFlagsBits.Administrator
							)
								? "yes"
								: "no"
						},
						lastField
					)
			]
		}
	);
}

export async function checkGlobalCooldown(
	ctx: ExecutionContext
): Promise<{ unallowed: boolean }> {
	const member = await getMember(ctx.source);

	if (!member || !ctx.target.cooldown) {
		return {
			unallowed: false
		};
	}

	if (
		await client.func.helper.cooldown(
			member?.id,
			ctx.commandPath,
			ctx.target.cooldown
		)
	) {
		const time = client.timeCalculator.to_beautiful_string(
			ctx.target.cooldown -
				(Date.now() -
					((await client.func.helper.getCooldownTimestamp(
						member.id,
						ctx.commandPath
					)) || 0)),
			ctx.lang
		);

		await replyDenied(
			ctx,
			`You need to wait **${time}** between each \`${ctx.commandPath}\``
		);
		return { unallowed: true };
	}
	return {
		unallowed: false
	};
}

export async function runCommand(ctx: ExecutionContext): Promise<void> {
	try {
		// 14 August 2026: Anais disabled that paywall since discord doesnt want to pay me ! ><
		// if (!(await checkCustomSdkGate(ctx))) return;

		const { passed, allowed } = await checkGuildPermissionRequirements(ctx);
		if (!passed) return;

		if (await checkCommandRateLimit(ctx)) return;

		const { unallowed } = await checkGlobalCooldown(ctx);
		if (unallowed) return;

		await deferIfNeeded(ctx);

		if (!(await checkNativePermission(ctx, allowed))) return;

		if (!(ctx.target as Command)?.run) {
			if (!isInteractionSource(ctx.source)) {
				const msg = await ctx.client.func.method.interactionSend(
					ctx.source,
					{
						embeds: [
							await ctx.client.func.method.createAwesomeEmbed(
								ctx.lang,
								ctx.command,
								ctx.client,
								ctx.source
							)
						],
						files: [
							await ctx.client.func.displayBotName.footerAttachmentBuilder(
								ctx.source
							)
						]
					}
				);
				setTimeout(() => msg.delete(), 60_000);
			}
			return;
		}

		if (!isInteractionSource(ctx.source)) {
			const argsOk = await ctx.client.func.method.checkCommandArgs(
				ctx.source,
				ctx.target,
				Array.from(ctx.args),
				ctx.lang
			);
			if (!argsOk) return;
		}

		const run = ctx.target.run!;
		void Promise.resolve(
			run(ctx.client, ctx.source as any, ctx.lang, ctx.args)
		).catch((error) => handleExecutionError(ctx, error));
	} catch (error) {
		await handleExecutionError(ctx, error);
	}
}
