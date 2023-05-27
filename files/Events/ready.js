const couleurmdr = require("colors"),
  { QuickDB } = require("quick.db"),
  db = new QuickDB(),
  config = require("../config"),
  register = require('../core/slashsync'),
  wait = require("timers/promises").setTimeout,
  logger = require(`${process.cwd()}/files/core/logger`);

const { Client, Collection, ApplicationCommandType, PermissionsBitField, ActivityType } = require('discord.js');
module.exports = async (client) => {

  await register(client, client.register_arr.map((command) => ({
    name: command.name,
    description: command.description,
    options: command.options,
    type: ApplicationCommandType.ChatInput
  })), { debug: true });

  async function term() {
    logger.log("(_) /\\  /\\___  _ __(_)_______  _ __  ".magenta),
    logger.log("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ".magenta),
    logger.log("| / __  / (_) | |  | |/ / (_) | | | |".magenta),
    logger.log("|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_|".magenta),
    logger.log(`【${config.console.emojis.KISA}】 >> Dev by Kisakay ♀️`.magenta);
  };

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

  async function quotesPresence() {
    const quotes = [
      "The only true wisdom is in knowing you know nothing. - Socrates",
      "Life is really simple, but we insist on making it complicated. - Confucius",
      "The unexamined life is not worth living. - Socrates",
      "Happiness is not something ready-made. It comes from your own actions. - Dalai Lama",
      "The only way to do great work is to love what you do. - Steve Jobs",
      "In three words I can sum up everything I've learned about life: it goes on. - Robert Frost",
      "The greatest glory in living lies not in never falling, but in rising every time we fall. - Nelson Mandela",
      "Life is 10% what happens to us and 90% how we react to it. - Charles R. Swindoll",
      "The purpose of our lives is to be happy. - Dalai Lama",
      "I have not failed. I've just found 10,000 ways that won't work. - Thomas A. Edison",
      "The best way to predict your future is to create it. - Peter Drucker",
      "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt",
      "In the end, it's not the years in your life that count. It's the life in your years. - Abraham Lincoln",
      "The greatest wealth is to live content with little. - Plato",
      "Life is a succession of lessons which must be lived to be understood. - Ralph Waldo Emerson",
      "The only way to escape the corruptible effect of praise is to go on working. - Albert Einstein",
      "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate, to have it make some difference that you have lived and lived well. - Ralph Waldo Emerson",
      "Life is what happens when you're busy making other plans. - John Lennon",
      "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful. - Albert Schweitzer",
      "The secret of success is to know something nobody else knows. - Aristotle Onassis"
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    client.user.setPresence({ activities: [{ name: randomQuote, type: ActivityType.Watching }] });
  }; quotesPresence();

  await term(), fetchInvites(), refreshDatabaseModel(), setInterval(quotesPresence, 80_000);
};