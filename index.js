/*Made by Ezermoz*/
const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js'),
    client = new Client({ intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_VOICE_STATES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_INVITES,
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
    let i=`${config.asciicrash}\n${err.stack || err.message}`
    CreateFiles.write(i.toString()+'\r\n');
});

const { QuickDB } = require("quick.db");
const db = new QuickDB();

const invites = new Collection();
client.invites = new Map();

// A pretty useful method to create a delay without blocking the whole script.
const wait = require("timers/promises").setTimeout;

client.on("ready", async () => {
  await wait(1000);

  client.guilds.cache.forEach(async (guild) => {
    const firstInvites = await guild.invites.fetch();
    invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
  });
});

client.on("inviteDelete", (invite) => {
  invites.get(invite.guild.id).delete(invite.code);
});

client.on("inviteCreate", async (invite) => {
  invites.get(invite.guild.id).set(invite.code, invite.uses);
  await db.set(`${invite.guild.id}.GUILD.INVITES.${invite.code}`, {
    creatorUser: `${invite.inviter.id}`,
  });
  
  await db.set(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.${invite.code}`, {
    creatorUser: `${invite.inviter.id}`,
    inviteCode: `${invite.code}`,
    guildID: `${invite.guild.id}`,
    invitesAmount: 0
  });
  
  checked = db.get(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA`)
  if(!checked) {
    await db.set(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.DATA`, {
      regular: 0,
      bonus: 0,
      leaves: 0,
      invites: 0
    });
  }
});

client.on("guildCreate", (guild) => {
  guild.invites.fetch().then(guildInvites => {
    invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
  })
});

client.on("guildDelete", async (guild) => {
  invites.delete(guild.id);

  await db.delete(`${invite.guild.id}.GUILD.INVITES.${invite.codes}`)
  await db.delete(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.${invite.codes}`)
});

client.on("guildMemberAdd", async (member) => {
  const newInvites = await member.guild.invites.fetch()
  const oldInvites = invites.get(member.guild.id);
  const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
  const inviter = await client.users.fetch(invite.inviter.id);
  const logChannel = member.guild.channels.cache.find(channel => channel.name === "join-logs");
  inviter
    ? console.log(`${member.user.tag} joined using invite code ${invite.code} from ${inviter.tag}. Invite was used ${invite.uses} times since its creation.`)
    : console.log(`${member.user.tag} joined but I couldn't find through which invite.`);

    /*await db.get(`${invite.guild.id}.GUILD.INVITES.${invite.codes}`)
    await db.get(`${invite.guild.id}.USER.${invite.inviter.id}.INVITES.${invite.codes}`)*/

    checked = db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`)

    if(checked) {
      await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.regular`, 1);
      await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);

    //{ leaves bonus invites regular}
    }
});

client.on("guildMemberRemove", async (member) => {
  const newInvites = await member.guild.invites.fetch()
  const oldInvites = invites.get(member.guild.id);
  const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
  const inviter = await client.users.fetch(invite.inviter.id);
  const logChannel = member.guild.channels.cache.find(channel => channel.name === "join-logs");
  inviter
    ? console.log(`${member.user.tag} leaved using invite code ${invite.code} from ${inviter.tag}. (${inviter.id}) Invite was used ${invite.uses} times since its creation on ${invite.guild.name} (${invite.guild.id})`)
    : console.log(`${member.user.tag} leaved but I couldn't find through which invite.`);

    checked = db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`)

    if(checked) {
      await db.sub(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);
      await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.leaves`, 1);

    //{  bonus: 0,,invites: 0}
    }
});