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

const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const logger = require(`${process.cwd()}/src/core/logger`);
const DataBaseModel = require(`${process.cwd()}/files/ihorizon-api/main.js`);

module.exports = async (client, reaction, user) => {
  async function reactionRole() {
    try {
      if (user.bot || user.id == client.user.id) return;
      if (!reaction.message.guild) return;
      // const fetched = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`)
      const fetched = await DataBaseModel({id: DataBaseModel.Get, key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`})
  
      if (fetched) {
        const role = reaction.message.guild.roles.cache.get(fetched.rolesID);
        if (!role) return;
  
        const member = reaction.message.guild.members.cache.get(user.id);
        return await member.roles.remove(role);
      };
      
      // const fetchedForNitro = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`)
      const fetchedForNitro = await DataBaseModel({id: DataBaseModel.Get, key: `${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`})
  
      if (fetchedForNitro) {
        const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
        if (!role) return;
  
        const member = reaction.message.guild.members.cache.get(user.id);
        return await member.roles.remove(role);
      };
    } catch (e) { logger.err(e) };
  };

  await reactionRole();
};