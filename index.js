/*Made by Ezermoz*/
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js'),
  client = new Client({ intents: 
    [
      GatewayIntentBits.AutoModerationConfiguration,
      GatewayIntentBits.AutoModerationExecution,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent
      ],
    partials: [Partials.Channel, Partials.Reaction,Partials.Message ] , ws: { properties: { browser: 'Discord iOS'}}
    });
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
}), 
client.login(config.token).catch(error => console.error(error.red)),
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
  try {
    const newInvites = await member.guild.invites.fetch()
    const oldInvites = invites.get(member.guild.id);
    const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
    const inviter = await client.users.fetch(invite.inviter.id)

      checked = db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`)
  
      if(checked) {
        await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.regular`, 1);
        await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);
      }
      let fetched = await db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`);

    let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`)
    if(!wChan) return;
    let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage`)
    if(!messssssage){ return client.channels.cache.get(wChan).send({content: `➕・<@${member.id}> join the guild. Invited by **${inviter.tag}** (**${fetched}** invites). Account created at: **${member.user.createdAt.toLocaleDateString()}**. Happy to see you on **${member.guild.name}**`})}

  var messssssage4 = messssssage
  .replace("{user}", member.user.tag)
  .replace("{guild}", member.guild.name)
  .replace("{createdat}", member.user.createdAt.toLocaleDateString()) 
  .replace("{membercount}", member.guild.memberCount)
  .replace("{inviter}", inviter.tag)
  .replace("{invites}", fetched)

  client.channels.cache.get(wChan).send({content: `${messssssage4}`})
    }catch(e){ 
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`)
      if(!wChan) return;
      let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage`)
      client.channels.cache.get(wChan).send({content: `➕・<@${member.id}> join the guild. Account created at: **${member.user.createdAt.toLocaleDateString()}**. Happy to see you on **${member.guild.name}**`})
  
      return console.error(e)  
    }
});


client.on("guildMemberRemove", async (member) => {
  const newInvites = await member.guild.invites.fetch()
  const oldInvites = invites.get(member.guild.id);
  const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
  const inviter = await client.users.fetch(invite.inviter.id)

    checked = db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA`)

    if(checked) {
      await db.sub(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`, 1);
      await db.add(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.leaves`, 1);
    }
    let fetched = await db.get(`${invite.guild.id}.USER.${inviter.id}.INVITES.DATA.invites`);

    try{
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`)
      if(wChan == null) return;
      if(!wChan) return;

    let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leavemessage`)
    if(!messssssage){ return client.channels.cache.get(wChan).send({content: `➖・<@${member.id}> just left the guild. Was Invited by **${inviter.tag}** (**${fetched}** invites). Goodbye, from **${member.guild.name}**.`})}

    var messssssage4 = messssssage
    .replace("{user}", member.user.tag)
    .replace("{guild}", member.guild.name)
    .replace("{membercount}", member.guild.memberCount)
    .replace("{inviter}", inviter.tag)
    .replace("{invites}", fetched)

    client.channels.cache.get(wChan).send({content: `${messssssage4}`})
    }catch(e){
      let wChan = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.leave`)
      if(wChan == null) return;
      if(!wChan) return;

    client.channels.cache.get(wChan).send({content: `➖・<@${member.id}> just left the guild. Goodbye, from **${member.guild.name}**.`})

      return console.error(e)
    }
  
});