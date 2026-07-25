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
	Interaction
} from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { blacklistTable } from "../client/ready.js";
import logger from "../../core/logger.js";
import { preExecutionCooldown, runCommand } from "../../core/commandExecutor.js";

/**
 * Résout la cible réelle (commande ou sous-commande) à partir des options
 * de l'interaction, et calcule le commandPath ("utils reload", "config perms edit"...).
 */
function resolveTarget(client: Client, interaction: ChatInputCommandInteraction<"cached">) {
	const command = client.commands?.get(interaction.commandName);
	if (!command) return null;

	const options = interaction.options as CommandInteractionOptionResolver;
	const group = options.getSubcommandGroup(false);
	const subCommand = options.getSubcommand(false);

	if (group && subCommand) {
		const commandPath = `${interaction.commandName} ${group} ${subCommand}`;
		const subCmd = client.subCommands.get(commandPath);
		if (subCmd?.run) return { command, target: subCmd, commandPath };
	} else if (subCommand) {
		const commandPath = `${interaction.commandName} ${subCommand}`;
		const subCmd = client.subCommands.get(commandPath);
		if (subCmd?.run) return { command, target: subCmd, commandPath };
	}

	return { command, target: command, commandPath: interaction.commandName };
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

		const resolved = resolveTarget(client, interaction as ChatInputCommandInteraction<"cached">);
		if (!resolved) {
			return interaction.reply({ content: "Connection error.", flags: [1 << 6] });
		}

		if (
			interaction.channel?.type === ChannelType.DM &&
			!resolved.command?.integration_types?.includes(1)
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

		if (await preExecutionCooldown(client, interaction as ChatInputCommandInteraction<"cached">)) {
			const data = await client.func.getLanguageData(interaction.guild?.id);
			return await interaction.reply({ content: data.Msg_cooldown, flags: [1 << 6] });
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
			await runCommand({
				client,
				source: interaction as ChatInputCommandInteraction<"cached">,
				lang,
				command: resolved.command,
				target: resolved.target,
				args: [],
				commandPath: resolved.commandPath
			});
		} catch (error) {
			logger.err(error);
		}
	}
};