/*Made by Ezermoz*/
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js'),
    client = new Client({ intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_VOICE_STATES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.DIRECT_MESSAGES, 
        Intents.FLAGS.GUILD_MEMBERS, 
        Intents.FLAGS.GUILD_BANS ], 
        partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
        ws: { properties: { browser: 'Discord iOS' } },
 }),
    config = require('./files/config.json'), { api } = require("./api/oauth.js"), { GiveawaysManager } = require('discord-giveaways'),
    c = require("colors"), { Player } = require("discord-player"), fs = require('fs'), date = require('date-and-time'),
    { registerPlayerEvents } = require('./files/events.js'), process = require("process")
client.commands = new Collection(), client.voiceManager = new Collection(),
client.interactions = new Collection(), client.register_arr = [], 
client.player = new Player(client), registerPlayerEvents(client.player),
fs.readdir("./files/Events", (_err, files) => { files.forEach(file => { if (!file.endsWith(".js")) return;
    const event = require(`./files/Events/${file}`);
    let eventName = file.split(".")[0];
    console.log(`[`.red,` 🌹 `.green,`]`.red,` >>`.yellow, `${eventName}`.bgRed);
    client.on(eventName, event.bind(null, client));
    delete require.cache[require.resolve(`./files/Events/${file}`)];});
}),fs.readdir("./files/Slash/", (_err, files) => { files.forEach(file => { if (!file.endsWith(".js")) return;
    let props = require(`./files/Slash/${file}`);
    let commandName = file.split(".")[0];
    client.interactions.set(commandName, { name: commandName,...props}),
    client.register_arr.push(props)});}),
    client.giveawaysManager = new GiveawaysManager(client, { storage: "./files/giveaways.json",
    updateCountdownEvery: 5000, embedColor: "#FF0000", reaction: "🎉",
    default: { botsCanWin: false, exemptPermissions: [ "MANAGE_MESSAGES", "ADMINISTRATOR" ]}
}), client.login(config.token).catch(error => console.error(error.red)),
process.on('uncaughtException', function(err) {
console.log(err.stack || err.message)
console.log("[  💥  ] >> Crash detected\n".red+
            "[  📜  ] >> Save in the logs\n".gray+
            "[  💖  ] >> Don't need to restart".green);
    const now = new Date(), CreateFiles = fs.createWriteStream('./files/logs/crash/'+date.format(now, 'DD.MM.YYYY HH;mm;ss')+".txt", {flags: 'a'});
    let i =
    `${config.asciicrash}\n${err.stack || err.message}`
    CreateFiles.write(i.toString()+'\r\n');
});

/*


client.on('messageReactionAdd', async (reaction, user) => {
console.log("[+] (Test)".green+`
Emoji Reaction: ${reaction.emoji.name} (${reaction.emoji.id})
Reaction Message: ${reaction.message.id}
Reaction Channel: ${reaction.message.channel.id}
Reaction Author: ${user.id} (${user.tag})`)
  // check that the reaction is from a message in the correct channel
  if (reaction.message.channel.id === '1019559069666775091' && user.id !== client.user.id) {
    // check that the reaction is from one of the predefined roles
    if (reaction.emoji.name === 'ROLE1_EMOJI' || reaction.emoji.name === 'ROLE2_EMOJI' || reaction.emoji.name === 'ROLE3_EMOJI') {
      // add the corresponding role to the user
      const role = reaction.message.guild.roles.cache.find(r => r.name === reaction.emoji.name);
      await reaction.message.guild.members.cache.get(user.id).roles.add(role);
    }
    //console.log(reaction.emoji.name)
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  // check that the reaction is from a message in the correct channel
  if (reaction.message.channel.id === '1019559069666775091' && user.id !== client.user.id) {
    // check that the reaction is from one of the predefined roles
    console.log(reaction.emoji.name)
    if (reaction.emoji.name === 'ROLE1_EMOJI' || reaction.emoji.name === 'ROLE2_EMOJI' || reaction.emoji.name === 'ROLE3_EMOJI') {
      // remove the corresponding role from the user
      const role = reaction.message.guild.roles.cache.find(r => r.name === reaction.emoji.name);
      await reaction.message.guild.members.cache.get(user.id).roles.remove(role);
    }
  }
});
*/

const { QuickDB } = require("quick.db");
const db = new QuickDB();

client.on('messageCreate', async message => {
  //await db.set(`${message.guild.id}`, {})
  /*
  await db.set(`${message.guild.id}.GUILD.TICKET`, {on_or_off: "true"})
  await db.set(`${message.guild.id}.GUILD.CUSTOM_CHANNEL`, {Here4CreateChannels: "id"})
  await db.set(`${message.guild.id}.GUILD.CUSTOM_CHANNEL.${message.channel.id}`, {channel_log_custom: "owner_id"})
  await db.set(`${message.guild.id}.GUILD.GUILD_CONFIG`, {antipub: "on", join: "id", leave: "id", joinroles: "id", joindm: "dm", joinmessage: "msg", leavemessage: "msg"})
  await db.set(`${message.guild.id}.GUILD.SNIPE.${message.channel.id}`, {snipeTimestamp: "time",snipeUserInfoPp: "link", snipeUserInfoTag: "tag#0001", snipe: "msg"})

  await db.set(`${message.guild.id}.USER.${message.author.id}.ECONOMY`, {money: "50", daily: "50", monthly: "50", weekly: "50"})
  await db.set(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING`, {xp: "760", level: "15", xptotal: "760"})
  await db.set(`${message.guild.id}.USER.${message.author.id}.XP_LEVELING.xp`, "81503036")
  await db.set(`${message.guild.id}.USER.${message.author.id}.CUSTOM_CHANNEL`, {customchanstatus: "id", customchanID: "id", channel_log_custom: "id", customchanName: "id"})
*/
  s = await db.get(message.guild.id)

  //console.log(s)

  // GLOBAL
  /*
  await db.set("GLOBAL.OWNER1", {userid: config.ownerid1})
  await db.set("GLOBAL.OWNER2", {userid: config.ownerid2})
  await db.set(`GLOBAL.USER_PROFIL.${message.author.id}`, {desc: "msg", age: 16})
  await db.set(`GLOBAL.BLACKLIST.${message.author.id}`, {blacklisted: "yes"})*/

  g = await db.get("GLOBAL")
  //console.log(g)
})
