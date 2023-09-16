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

import date from 'date-and-time';
import { BaseInteraction, Client, Collection, EmbedBuilder, Interaction, InteractionResponse, Permissions } from 'discord.js';
import config from '../files/config';
import * as db from '../core/functions/DatabaseModel';
import logger from '../core/logger';
import fs from 'fs';
import { format } from 'date-fns';

var timeout = 1000;

export = async (client: any, interaction: any) => {

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
        if (!interaction.isCommand()
            || !interaction.guild?.channels
            || interaction.user.bot) return;

        let tn = Date.now();
        var fetch = await db.DataBaseModel({ id: db.Get, key: `TEMP.COOLDOWN.${interaction.user.id}` });

        if (fetch !== null && timeout - (tn - fetch) > 0) {
            return true;
        };

        await db.DataBaseModel({ id: db.Set, key: `TEMP.COOLDOWN.${interaction.user.id}`, value: tn });
        return false;
    };

    await slashExecutor(), logsCommands();
};