/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { CreateTicketChannel, TicketDelete, TicketTranscript, TicketAddMember_2, TicketRemoveMember_2 } from '../core/ticketsManager';
import { AddEntries } from '../core/giveawaysManager';
import * as db from '../core/functions/DatabaseModel';
import config from '../files/config';
import logger from '../core/logger';

import { BaseInteraction, Client, Collection, EmbedBuilder, Interaction, InteractionResponse, Permissions } from 'discord.js';
import { format } from 'date-fns';
import date from 'date-and-time';
import fs from 'fs';

var timeout: number = 1000;

export = async (client: any, interaction: any) => {

    async function buttonExecutor() {
        if (!interaction.isButton()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        if (interaction.customId === 'confirm-entry-giveaway'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `GIVEAWAYS.${interaction.guild.id}.${interaction.channel.id}.${interaction.message.id}`
            })) {
            AddEntries(interaction);
            return;
        } else if (interaction.customId === 'open-new-ticket'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `${interaction.guild.id}.GUILD.TICKET.${interaction.message.id}`
            })) {
            CreateTicketChannel(interaction);
            return;
        } else if (interaction.customId === 't-embed-delete-ticket'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `${interaction.guild.id}.TICKET_ALL.${interaction.user.id}.${interaction.channel.id}`
            })) {
            TicketDelete(interaction);
            return;
        } else if (interaction.customId === 't-embed-transcript-ticket'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `${interaction.guild.id}.TICKET_ALL.${interaction.user.id}.${interaction.channel.id}`
            })) {
            TicketTranscript(interaction);
            return;
        } else if (interaction.customId === 't-embed-add-ticket'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `${interaction.guild.id}.TICKET_ALL.${interaction.user.id}.${interaction.channel.id}`
            })) {
            TicketAddMember_2(interaction);
            return;
        } else if (interaction.customId === 't-embed-remove-ticket'
            &&
            await db.DataBaseModel({
                id: db.Get,
                key: `${interaction.guild.id}.TICKET_ALL.${interaction.user.id}.${interaction.channel.id}`
            })) {
            TicketRemoveMember_2(interaction);
            return;
        };
    };

    async function slashExecutor() {
        if (!interaction.isCommand()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        let command = client.interactions.get(interaction.commandName);
        if (!command) {
            await interaction.deleteReply();
            return interaction.followUp({ content: "Connection error.", ephemeral: true });
        }
        if (await cooldDown()) {
            let data = await client.functions.getLanguageData(interaction.guild.id);

            await interaction.deleteReply();
            await interaction.followUp({ content: data.Msg_cooldown, ephemeral: true });
            return;
        };

        try {
            if (await db.DataBaseModel({ id: db.Get, key: `GLOBAL.BLACKLIST.${interaction.user.id}.blacklisted` })) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0827F5").setTitle(":(")
                            .setImage(config.core.blacklistPictureInEmbed)
                    ]
                });
                return;
            };

            await interaction.deferReply();
            await command.run(client, interaction);
        } catch (e: any) {
            logger.err(e);
        };
    };

    async function logsCommands(): Promise<void> {
        if (!interaction.isCommand()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        let optionsList: string[] = interaction.options._hoistedOptions.map((element: { name: any; value: any; }) => `${element.name}:"${element.value}"`);
        let subCmd: string = '';

        if (interaction.options['_subcommand']) {
            subCmd = interaction.options.getSubcommand();
        };

        let logMessage = `[${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}] "${interaction.guild?.name}" #${interaction.channel ? interaction.channel.name : 'Unknown Channel'}:\n` +
            `${interaction.user.username}:\n` +
            `/${interaction.commandName} ${subCmd} ${optionsList.join(' ')}\n\n`;

        fs.appendFile(`${process.cwd()}/src/files/slash.log`, logMessage, (err) => {
            if (err) {
                logger.warn('Error writing to slash.log');
            };
        });
    };

    async function cooldDown() {
        let tn = Date.now();
        var fetch = await db.DataBaseModel({ id: db.Get, key: `TEMP.COOLDOWN.${interaction.user.id}` });
        if (fetch !== null && timeout - (tn - fetch) > 0) return true;

        await db.DataBaseModel({ id: db.Set, key: `TEMP.COOLDOWN.${interaction.user.id}`, value: tn });
        return false;
    };

    slashExecutor(), buttonExecutor(), logsCommands();
};