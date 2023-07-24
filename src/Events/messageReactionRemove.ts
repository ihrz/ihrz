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

import { Client, Collection, EmbedBuilder, Permissions, ReactionEmoji, User } from 'discord.js';
import logger from '../core/logger';
import * as db from '../core/functions/DatabaseModel';

export = async (client: Client, reaction: any, user: User) => {

    async function reactionRole() {
        try {
            if (user.bot || user.id == client.user?.id
                || !reaction.message.guildId) return;

            const fetched = await db.DataBaseModel({ id: db.Get, key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}` })

            if (fetched) {
                const role = reaction.message.guild.roles.cache.get(fetched.rolesID);
                if (!role) return;

                const member = reaction.message.guild.members.cache.get(user.id);
                return await member?.roles.remove(role);
            };

            const fetchedForNitro = await db.DataBaseModel({ id: db.Get, key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}` })

            if (fetchedForNitro) {
                const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
                if (!role) return;

                const member = reaction.message.guild.members.cache.get(user.id);
                return await member?.roles.remove(role);
            };
        } catch (e: any) { return; };
    };

    await reactionRole();
};