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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js';

import config from '../../../files/config.js';
import ms, { StringValue } from 'ms';
import date from 'date-and-time';

import { LanguageData } from '../../../../types/languageData';
import { OwnIHRZ } from '../../../core/ownihrzManager';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let action_to_do = interaction.options.getString('action');
        let id_to_bot = interaction.options.getString('id');

        if ((interaction.user.id !== config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        let data_2 = await client.db.get(`OWNIHRZ`);

        if (action_to_do === 'shutdown') {
            if (!id_to_bot) {
                await interaction.reply({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await client.db.get(`OWNIHRZ.${userId}.${id_to_bot}.power_off`);

                        if (fetch) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already shutdown...`, ephemeral: true });
                            return;
                        };

                        await client.db.set(`OWNIHRZ.${userId}.${id_to_bot}.power_off`, true);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now shutdown.\nNow, the bot container can't be Power On when iHorizon-Prod booting...`,
                            ephemeral: true
                        });
                        return new OwnIHRZ().ShutDown(id_to_bot);
                    }
                }
            }

        } else if (action_to_do === 'poweron') {
            if (!id_to_bot) {
                await interaction.reply({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await client.db.get(`OWNIHRZ.${userId}.${id_to_bot}.power_off`);

                        if (!fetch) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already Power On...`, ephemeral: true });
                            return;
                        };

                        await client.db.set(`OWNIHRZ.${userId}.${id_to_bot}.power_off`, false);

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now Power On.\nNow, the bot container can be Power On when iHorizon-Prod booting...`, ephemeral: true });
                        return new OwnIHRZ().PowerOn(id_to_bot);
                    }
                }
            };

        } else if (action_to_do === 'delete') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        await client.db.delete(`OWNIHRZ.${userId}.${id_to_bot}`);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now deleted.\nThe bot container has been entierly erased...`,
                            ephemeral: true
                        });
                        return new OwnIHRZ().Delete(id_to_bot);
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

            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(data_3).setColor('#000000')], ephemeral: true });
            return;
        } else if (action_to_do === 'add-expire') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await client.db.add(`OWNIHRZ.${userId}.${id_to_bot}.expireIn`, ms((time as StringValue)));

                        let expireIn = await client.db.get(`OWNIHRZ.${userId}.${id_to_bot}.expireIn`);
                        let expire: string | null = null;

                        if (expireIn !== null) {
                            expire = date.format(new Date(expireIn), 'ddd, MMM DD YYYY');
                        }

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });
                        return;
                    };
                }
            };
        } else if (action_to_do === 'sub-expire') {
            for (let userId in data_2) {
                for (let botId in data_2[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await client.db.sub(`OWNIHRZ.${userId}.${id_to_bot}.expireIn`, ms((time as StringValue)));

                        let expireIn = await client.db.get(`OWNIHRZ.${userId}.${id_to_bot}.expireIn`);
                        let expire: string | null = null;

                        if (expireIn !== null) {
                            expire = date.format(new Date(expireIn), 'ddd, MMM DD YYYY');
                        };

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`,
                            ephemeral: true
                        });
                        return;
                    };
                }
            };
        }

        return;
    },
};