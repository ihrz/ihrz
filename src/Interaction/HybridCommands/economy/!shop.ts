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
    ActionRowBuilder,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    Message,
    StringSelectMenuBuilder,
    User,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { getMemberBoost } from './economy.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (await client.db.get(`${interaction.guildId}.ECONOMY.disabled`) === true) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_disable_msg
                    .replace('${interaction.user.id}', interaction.member.user.id)
            });
            return;
        };

        let economy = await client.db.get(`${interaction.guildId}.ECONOMY`) as DatabaseStructure.EconomyModel;
        let buyableRolesArray = Object.entries(economy?.buyableRoles || {}).map(([roleId, details]) => ({
            roleId,
            ...details
        }));
        var baseData = (await client.db.get(`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY`) || {
            money: 0,
            bank: 0,
            ownedRoles: []
        }) as DatabaseStructure.EconomyUserSchema;
        var possibleBoost = await getMemberBoost(interaction.member!);

        baseData.money = baseData.money || 0;
        baseData.bank = baseData.bank || 0;
        baseData.ownedRoles = baseData.ownedRoles || [];


        if (buyableRolesArray.length === 0) {
            await client.method.interactionSend(interaction, {
                content: lang.economy_shop_not_set
            });
            return;
        }

        let buyableRoles = buyableRolesArray // buyableRolesArray.filter((role) => !baseData.ownedRoles?.includes(role.roleId));

        const embed = new EmbedBuilder()
            .setTitle(lang.economy_shop_embed_title
                .replace("${interaction.guild.name}", interaction.guild.name)
            )
            .setColor("#45f712")
            .setDescription(lang.economy_shop_embed_desc)
            .setFooter(await client.method.bot.footerBuilder(interaction))
            .setFields(
                { name: lang.balance_embed_fields1_name, value: `${baseData.bank || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true },
                { name: lang.balance_embed_fields2_name, value: `${baseData.money || 0}${client.iHorizon_Emojis.icon.Coin}`, inline: true },
                { name: lang.var_boost, value: `${possibleBoost}x`, inline: true }
            )
            ;

        const selectMenuOptions = buyableRoles.map((role) => ({
            label: interaction.guild?.roles.cache.get(role.roleId)?.name || lang.economy_shop_unknown_role,
            value: role.roleId,
            description: (baseData.ownedRoles?.includes(role.roleId) ? lang.economy_shop_already_owned : `${lang.var_price}: ${role.price} 💰`)
        }));

        // if there are no roles available for purchase
        if (selectMenuOptions.length === 0) {
            // check if already owned roles are not given to the user

            for (const roleId of baseData.ownedRoles || []) {
                if (!interaction.member.roles.cache.has(roleId)) {
                    await interaction.member.roles.add(roleId, "[Economy Shop] Role was not given to the user.");
                }
            }

            await client.method.interactionSend(interaction, {
                content: lang.economy_shop_not_set
            });
            return;
        }

        // create a select menu
        const selectMenu = new StringSelectMenuBuilder()
            .addOptions(selectMenuOptions)
            .setCustomId("shop")
            .setPlaceholder(lang.economy_shop_menu_placeholder);

        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        let og_interaction = await client.method.interactionSend(interaction, {
            embeds: [embed],
            files: [await client.method.bot.footerAttachmentBuilder(interaction)],
            components: [actionRow]
        });

        // create a collector
        const collector = og_interaction.createMessageComponentCollector({
            time: 600_000,
            componentType: ComponentType.StringSelect
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.member?.user.id) {
                await i.reply({
                    content: lang.help_not_for_you,
                    ephemeral: true
                });
                return;
            }

            const role = buyableRoles.find((role) => role.roleId === i.values[0]);
            if (!role) {
                await i.reply({
                    content: lang.economy_shop_not_available,
                    ephemeral: true
                });
                return;
            }

            // check if the user already owns the role
            if (baseData.ownedRoles?.includes(role.roleId)) {
                await i.reply({
                    content: lang.economy_shop_already_own_role,
                    ephemeral: true
                });
                return;
            }

            // check if the user has enough money to purchase the role
            if (baseData.money! < role.price) {
                await i.reply({
                    content: lang.economy_shop_not_enough_money,
                    ephemeral: true
                });
                return;
            }

            baseData.ownedRoles?.push(role.roleId);

            await interaction.member?.roles.add(role.roleId, "[Economy Module] Purchased from the shop");
            await client.db.set(`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY.money`, (baseData.money ?? 0) - role.price);
            await client.db.set(`${interaction.guildId}.USER.${interaction.member.id}.ECONOMY.ownedRoles`, [...(baseData.ownedRoles || []), role.roleId]);

            var string_role_name = interaction.guild?.roles.cache.get(role.roleId)?.name || lang.economy_shop_unknown_role
            await i.reply({
                content: lang.economy_shop_role_purchased
                    .replace("{roleName}", string_role_name)
                    .replace("${role.price}", role.price.toString()),
                ephemeral: true
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'legit') return;
            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu.setDisabled(true));
            await og_interaction.edit({
                components: [row]
            });
        });
    },
};