/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'pwss';

import { format } from '../../../core/functions/date-and-time.js';
import { OwnIHRZ } from '../../../core/modules/ownihrzManager.js';

import { LanguageData } from '../../../../types/languageData';

const OWNIHRZ = new OwnIHRZ();

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let action_to_do = interaction.options.getString('action');
        let id_to_bot = interaction.options.getString('id');

        if (!client.owners.includes(interaction.user.id)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        let tableOWNIHRZ = client.db.table("OWNIHRZ")
        let ownihrzClusterData = await tableOWNIHRZ.get('CLUSTER');

        // Working with Cluster
        if (action_to_do === 'shutdown') {
            if (!id_to_bot) {
                await interaction.reply({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in ownihrzClusterData as any) {
                let botData = ownihrzClusterData[userId];
                for (let botId in botData) {
                    if (botId === id_to_bot) {
                        let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

                        if (fetch.PowerOff) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already shutdown...`, ephemeral: true });
                            return;
                        }

                        await tableOWNIHRZ.set(`CLUSTER.${userId}.${id_to_bot}.PowerOff`, true);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now shutdown.\nNow, the bot container can't be Power On when iHorizon-Prod booting...`,
                            ephemeral: true
                        });

                        return await OWNIHRZ.ShutDown(client.config, fetch.Cluster, id_to_bot);
                    }
                }
            }

            // Working with Cluster
        } else if (action_to_do === 'poweron') {

            if (!id_to_bot) {
                await interaction.reply({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in ownihrzClusterData as any) {
                let botData = ownihrzClusterData[userId];
                for (let botId in botData) {
                    if (botId === id_to_bot) {
                        let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

                        if (!fetch.PowerOff) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already up...`, ephemeral: true });
                            return;
                        }

                        await tableOWNIHRZ.set(`CLUSTER.${userId}.${id_to_bot}.PowerOff`, false);

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now Power On.\nNow, the bot container can be Power On when iHorizon-Prod booting...`, ephemeral: true });
                        return await OWNIHRZ.PowerOn(client.config, fetch.Cluster, id_to_bot);
                    }
                }
            }

        } else if (action_to_do === 'delete') {

            for (let userId in ownihrzClusterData as any) {
                let botData = ownihrzClusterData[userId];
                for (let botId in botData) {
                    if (botId === id_to_bot) {
                        let fetch = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}`);

                        await tableOWNIHRZ.delete(`CLUSTER.${userId}.${id_to_bot}`);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now deleted.\nThe bot container has been entierly erased...`,
                            ephemeral: true
                        });
                        return await OWNIHRZ.Delete(client.config, fetch.Cluster, id_to_bot);
                    }
                }
            }

        } else if (action_to_do === 'ls') {
            let emb = new EmbedBuilder().setColor('#000000').setDescription("OWNIHRZ");

            for (let userId in ownihrzClusterData as any) {
                let botData = ownihrzClusterData[userId];
                for (let botId in botData) {
                    let toAdd =
                        `**Owner**: <@${userId}>\n**Bot's ID**: \`${botData[botId].Bot?.Id}\`\n**Bot's Name**: \`${botData[botId].Bot.Name}\`\n**Expire In**: \`${format(new Date(botData[botId].ExpireIn), 'ddd, MMM DD YYYY')}\`\r\n`

                    emb.addFields({ name: botId, value: toAdd, inline: false })
                }
            };

            await interaction.reply({ embeds: [emb], ephemeral: true });
            return;

        } else if (action_to_do === 'add-expire') {

            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.add(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`, client.timeCalculator.to_ms(time)!);

                        let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
                        }

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });
                        return;
                    }
                }
            };

        } else if (action_to_do === 'sub-expire') {

            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.sub(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`, client.timeCalculator.to_ms(time)!);

                        let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
                        }

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`,
                            ephemeral: true
                        });
                        return;
                    }
                }
            };
        }

        return;
    },
};