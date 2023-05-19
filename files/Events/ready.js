const couleurmdr = require("colors"),
  { QuickDB } = require("quick.db"),
  db = new QuickDB(),
  config = require("../config"),
  register = require('../core/slashsync'),
  wait = require("timers/promises").setTimeout,
  logger = require(`${process.cwd()}/files/core/logger`);

module.exports = async (client) => {
  const { Client, Collection, ChannelType, ApplicationCommandType, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

  await register(client, client.register_arr.map((command) => ({
    name: command.name,
    description: command.description,
    options: command.options,
    type: ApplicationCommandType.ChatInput
  })), { debug: true });
  
  async function term() {
    logger.log("    _ __  __           _                 ".red) 
    logger.log("   (_) / / /___  _____(_)___  ____  ____ ".red)
    logger.log("  / / /_/ / __ \\/ ___/ /_  / / __ \\/ __ \\".red)
    logger.log(" / / __  / /_/ / /  / / / /_/ /_/ / / / /".red)
    logger.log("/_/_/ /_/\\____/_/  /_/ /___/\\____/_/ /_/".red), 
    logger.log("[ 🟢 ] >> Dev by Kisakay".gray);
  }
  
  async function fetchInvites() {
    client.guilds.cache.forEach(async (guild) => {
      try {
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
        const firstInvites = await guild.invites.fetch();
        client.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
      } catch (error) {
        logger.err(`Error fetching invites for guild ${guild.id}: ${error}`);
      }
    });
  };
  
  async function refreshDatabaseModel() {
    await db.set(`GLOBAL.OWNER.${config.owner.ownerid1}`, { owner: true }),
    await db.set(`TEMP`, {}),
    await wait(1000);
  };

  await term(), fetchInvites(), refreshDatabaseModel();
}