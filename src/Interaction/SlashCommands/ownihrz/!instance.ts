/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

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
} from 'discord.js';

import date from 'date-and-time';

import { LanguageData } from '../../../../types/languageData';
import { OwnIHRZ } from '../../../core/modules/ownihrzManager.js';
import config from '../../../files/config.js';
import ms, { StringValue } from 'ms';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        let action_to_do = interaction.options.getString('action');
        let id_to_bot = interaction.options.getString('id');

        if ((interaction.user.id !== process.env.OWNER_ONE || config.owner.ownerid1) && (interaction.user.id !== config.owner.ownerid2)) {
            await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, ephemeral: true });
            return;
        };

        let tableOWNIHRZ = client.db.table("OWNIHRZ")
        let ownihrzData = await tableOWNIHRZ.get('MAIN');
        let ownihrzClusterData = await tableOWNIHRZ.get('CLUSTER');

        // Working with Cluster
        if (action_to_do === 'shutdown') {
            if (!id_to_bot) {
                await interaction.reply({
                    content: `${interaction.user}, you have forgot the ID of the bot!`
                })
            };

            for (let userId in ownihrzData) {
                for (let botId in ownihrzData[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await tableOWNIHRZ.get(`MAIN.${userId}.${id_to_bot}.PowerOff`);

                        if (fetch) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already shutdown...`, ephemeral: true });
                            return;
                        };

                        await tableOWNIHRZ.set(`MAIN.${userId}.${id_to_bot}.PowerOff`, true);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now shutdown.\nNow, the bot container can't be Power On when iHorizon-Prod booting...`,
                            ephemeral: true
                        });
                        return new OwnIHRZ().ShutDown(id_to_bot);
                    }
                }
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

                        return new OwnIHRZ().ShutDown_Cluster(fetch.Cluster, id_to_bot);
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

            for (let userId in ownihrzData) {
                for (let botId in ownihrzData[userId]) {
                    if (botId === id_to_bot) {
                        let fetch = await tableOWNIHRZ.get(`MAIN.${userId}.${id_to_bot}.PowerOff`);

                        if (!fetch) {
                            await interaction.reply({ content: `OwnIHRZ of <@${userId}>, is already Power On...`, ephemeral: true });
                            return;
                        };

                        await tableOWNIHRZ.set(`MAIN.${userId}.${id_to_bot}.PowerOff`, false);

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now Power On.\nNow, the bot container can be Power On when iHorizon-Prod booting...`, ephemeral: true });
                        return new OwnIHRZ().PowerOn(id_to_bot);
                    }
                }
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
                        return new OwnIHRZ().PowerOn_Cluster(fetch.Cluster, id_to_bot);
                    }
                }
            }

            // Working with cluster
        } else if (action_to_do === 'delete') {
            for (let userId in ownihrzData) {
                for (let botId in ownihrzData[userId]) {
                    if (botId === id_to_bot) {
                        await tableOWNIHRZ.delete(`MAIN.${userId}.${id_to_bot}`);

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` are now deleted.\nThe bot container has been entierly erased...`,
                            ephemeral: true
                        });
                        return new OwnIHRZ().Delete(id_to_bot);
                    }
                }
            };

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
                        return new OwnIHRZ().Delete_Cluster(fetch.Cluster, id_to_bot);
                    }
                }
            }

            // Working with Cluster
        } else if (action_to_do === 'ls') {
            let emb = new EmbedBuilder().setColor('#000000').setDescription("OWNIHRZ");

            for (let i in ownihrzData) {
                if (i !== 'TEMP') {
                    for (let j in ownihrzData[i]) {
                        let toAdd =
                            `**Owner**: <@${i}>\n**Bot's ID**: \`${ownihrzData[i][j].Bot?.Id}\`\n**Bot's Name**: \`${ownihrzData[i][j].Bot.Name}\`\n**Expire In**: \`${date.format(new Date(ownihrzData[i][j].ExpireIn), 'ddd, MMM DD YYYY')}\`\r\n`

                        emb.addFields({ name: j, value: toAdd, inline: false })
                    };
                };
            };

            for (let userId in ownihrzClusterData as any) {
                let botData = ownihrzClusterData[userId];
                for (let botId in botData) {
                    let toAdd =
                        `**Owner**: <@${userId}>\n**Bot's ID**: \`${botData[botId].Bot?.Id}\`\n**Bot's Name**: \`${botData[botId].Bot.Name}\`\n**Expire In**: \`${date.format(new Date(botData[botId].ExpireIn), 'ddd, MMM DD YYYY')}\`\r\n`

                    emb.addFields({ name: botId, value: toAdd, inline: false })
                }
            };

            await interaction.reply({ embeds: [emb], ephemeral: true });
            return;

            // Working with Cluster
        } else if (action_to_do === 'add-expire') {

            for (let userId in ownihrzData) {
                for (let botId in ownihrzData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.add(`MAIN.${userId}.${id_to_bot}.ExpireIn`, ms((time as StringValue)));

                        let ExpireIn = await tableOWNIHRZ.get(`MAIN.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = date.format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
                        };

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });
                        return;
                    };
                }
            };

            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.add(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`, ms((time as StringValue)));

                        let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = date.format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
                        }

                        await interaction.reply({ content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`, ephemeral: true });
                        return;
                    }
                }
            };

            // Working with Cluster
        } else if (action_to_do === 'sub-expire') {

            for (let userId in ownihrzData) {
                for (let botId in ownihrzData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.sub(`MAIN.${userId}.${id_to_bot}.ExpireIn`, ms((time as StringValue)));

                        let ExpireIn = await tableOWNIHRZ.get(`MAIN.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = date.format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
                        };

                        await interaction.reply({
                            content: `OwnIHRZ of <@${userId}>, with id of:\`${id_to_bot}\` have now this expire Date changed!.\nThe bot expire now in \`${expire}\`!`,
                            ephemeral: true
                        });
                        return;
                    };
                }
            };

            for (let userId in ownihrzClusterData as any) {
                for (let botId in ownihrzClusterData[userId]) {
                    if (botId === id_to_bot) {
                        let time = interaction.options.getString('time') || '0d';

                        await tableOWNIHRZ.sub(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`, ms((time as StringValue)));

                        let ExpireIn = await tableOWNIHRZ.get(`CLUSTER.${userId}.${id_to_bot}.ExpireIn`);
                        let expire: string | null = null;

                        if (ExpireIn !== null) {
                            expire = date.format(new Date(ExpireIn), 'ddd, MMM DD YYYY');
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