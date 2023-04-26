/*Made by Kisakay*/
const { Client, Collection, ChannelType, PermissionFlagsBits, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'),
  client = new Client({
    intents: [GatewayIntentBits.AutoModerationConfiguration, GatewayIntentBits.AutoModerationExecution, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates
    ], partials: [Partials.Channel, Partials.Reaction, Partials.Message], ws: { properties: { browser: 'Discord iOS' } }
  }), config = require('./files/config.json'), { api } = require("./api/oauth.js"), { GiveawaysManager } = require('discord-giveaways'),
  c = require("colors"), { Player } = require("discord-player"), fs = require('fs'), date = require('date-and-time'), process = require("process")
client.commands = new Collection(), client.voiceManager = new Collection(), client.invites = new Map(), client.interactions = new Collection(), client.register_arr = [],
  { playerEvents } = require(`${process.cwd()}/files/playerEvents.js`), client.player = new Player(client, { ytdlOptions: { quality: 'highestaudio', smoothVolume: true, highWaterMark: 1 << 25, } }), playerEvents(client.player),
  fs.readdir("./files/Events", (_err, files) => {
    files.forEach(file => {
      if (!file.endsWith(".js")) return; const event = require(`./files/Events/${file}`); let eventName = file.split(".")[0];
      console.log(`[`.red, ` 🌹 `.green, `]`.red, ` >>`.yellow, `${eventName}`.bgRed); client.on(eventName, event.bind(null, client)); delete require.cache[require.resolve(`./files/Events/${file}`)];
    });
  }), fs.readdir("./files/Slash/", (_err, files) => {
    files.forEach(file => {
      if (!file.endsWith(".js")) return; let props = require(`./files/Slash/${file}`); let commandName = file.split(".")[0];
      client.interactions.set(commandName, { name: commandName, ...props }), client.register_arr.push(props)
    });
  }),
  client.giveawaysManager = new GiveawaysManager(client, {
    storage: "./files/giveaways.json", updateCountdownEvery: 5000, embedColor: "#FF0000", reaction: "🎉",
    default: { botsCanWin: false, exemptPermissions: ["MANAGE_MESSAGES", "ADMINISTRATOR"] }
  }), client.login(config.token).catch(error => console.error(error.red)),
  process.on('uncaughtException', function (err) {
    console.log(err.stack || err.message), console.log("[  💥  ] >> Crash detected\n".red +
      "[  📜  ] >> Save in the logs\n".gray + "[  💖  ] >> Don't need to restart".green); const now = new Date(), CreateFiles = fs.createWriteStream('./files/logs/crash/' +
        date.format(now, 'DD.MM.YYYY HH;mm;ss') + ".txt", { flags: 'a' }); let i = `${config.asciicrash}\n${err.stack || err.message}`; CreateFiles.write(i.toString() + '\r\n');
  });