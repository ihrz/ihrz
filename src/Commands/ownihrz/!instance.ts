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

import {
    Client,
    EmbedBuilder,
} from 'discord.js';

import * as db from '../../core/functions/DatabaseModel';
import { execSync } from 'child_process';

import config from '../../files/config';
import date from 'date-and-time';
import axios from 'axios';
import ms from 'ms';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let action_to_do = interaction.options.getString('action');
        let id_to_bot = interaction.options.getString('id');


        if ((interaction.user.id !== config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.deleteReply();
            await interaction.followUp({ content: "❌", ephemeral: true });
            return;
        };

        let data_2 = await db.DataBaseModel({
            id: db.Get,
            key: `OWNIHRZ`
        });

        if (action_to_do === 'shutdown') {
            if (!id_to_bot) {
                await interaction.deleteReply();
                await interaction.followUp({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await db.DataBaseModel({
                            id: db.Get,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.power_off`,
                        });

                        if (fetch) {
                            await interaction.deleteReply();
                            await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, is already shutdown...`, ephemeral: true });
                            return;
                        };

                        await db.DataBaseModel({
                            id: db.Set,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.power_off`,
                            value: true
                        });

                        await interaction.deleteReply();
                        await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now shutdown.\nNow, the bot container can't be Power On when iHorizon-Prod booting...`, ephemeral: true });

                        execSync(`pm2 stop ${id_to_bot} -f`, {
                            stdio: [0, 1, 2],
                            cwd: process.cwd(),
                        });

                        execSync(`pm2 delete ${id_to_bot}`, {
                            stdio: [0, 1, 2],
                            cwd: process.cwd(),
                        });

                        return;
                    }
                }
            }

        } else if (action_to_do === 'poweron') {
            if (!id_to_bot) {
                await interaction.deleteReply();
                await interaction.followUp({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await db.DataBaseModel({
                            id: db.Get,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.power_off`,
                        });

                        if (!fetch) {
                            await interaction.deleteReply();
                            await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, is already Power On...`, ephemeral: true });
                            return;
                        };

                        await db.DataBaseModel({
                            id: db.Set,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.power_off`,
                            value: false
                        });

                        await interaction.deleteReply();
                        await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now Power On.\nNow, the bot container can be Power On when iHorizon-Prod booting...`, ephemeral: true });

                        execSync(`pm2 start ./dist/${id_to_bot}.js -f`, {
                            stdio: [0, 1, 2],
                            cwd: data_2[userId][botId].path,
                        });

                        return;
                    }
                }
            };

        } else if (action_to_do === 'delete') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        await db.DataBaseModel({
                            id: db.Delete,
                            key: `OWNIHRZ.${userId}.${id_to_bot}`,
                        });

                        await interaction.deleteReply();
                        await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now deleted.\nThe bot container has been entierly erased...`, ephemeral: true });

                        execSync(`pm2 stop ${id_to_bot} -f`, {
                            stdio: [0, 1, 2],
                            cwd: process.cwd(),
                        });

                        execSync(`pm2 delete ${id_to_bot}`, {
                            stdio: [0, 1, 2],
                            cwd: process.cwd(),
                        });

                        execSync(`rm -rf *`, {
                            stdio: [0, 1, 2],
                            cwd: data_2[userId][botId].path,
                        });

                        return;
                    }
                }
            };
        } else if (action_to_do === 'ls') {
            let data_3 = 'Instance:\n';

            for (let i in data_2) {
                if (i !== 'TEMP') {
                    for (let j in data_2[i]) {
                        data_3 +=
                            `[OWNIHRZ] (${j}) - **Owner**: <@${i}> | **BotId**: \`${data_2[i][j].bot?.id}\` | **BotName**: \`${data_2[i][j].bot?.username}\` | **Expire In**: \`${date.format(new Date(data_2[i][j].expireIn), 'ddd, MMM DD YYYY')}\`\r\n`
                    };
                };
            };

            await interaction.deleteReply();
            await interaction.followUp({ embeds: [new EmbedBuilder().setDescription(data_3).setColor('#000000')], ephemeral: true });
            return;
        } else if (action_to_do === 'add-expire') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await db.DataBaseModel({
                            id: db.Add,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.expireIn`,
                            value: ms(time)
                        });

                        let expire = date.format(new Date(
                            await db.DataBaseModel({
                                id: db.Get,
                                key: `OWNIHRZ.${userId}.${id_to_bot}.expireIn`,
                            })
                        ), 'ddd, MMM DD YYYY');

                        await interaction.deleteReply();
                        await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });

                        return;
                    };
                }
            };
        } else if (action_to_do === 'sub-expire') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await db.DataBaseModel({
                            id: db.Sub,
                            key: `OWNIHRZ.${userId}.${id_to_bot}.expireIn`,
                            value: ms(time)
                        });

                        let expire = date.format(new Date(
                            await db.DataBaseModel({
                                id: db.Get,
                                key: `OWNIHRZ.${userId}.${id_to_bot}.expireIn`,
                            })
                        ), 'ddd, MMM DD YYYY');

                        await interaction.deleteReply();
                        await interaction.followUp({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });

                        return;
                    };
                }
            };
        }

        return;
    },
};