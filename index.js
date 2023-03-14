/*Made by Ezermoz*/
const { Client, Collection,ChannelType,PermissionFlagsBits, PermissionsBitField, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'),
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
    c = require("colors"), { Player } = require("discord-player"), fs = require('fs'), date = require('date-and-time'), process = require("process")
client.commands = new Collection(), client.voiceManager = new Collection(),
client.interactions = new Collection(), client.register_arr = [], 
client.player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    smoothVolume: true,
    highWaterMark: 1 << 25,
  },
}),
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

  await db.delete(`${invites.guild.id}`)
  await db.delete(`${invites.guild.id}`)
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
    let messssssage = await db.get(`${member.guild.id}.GUILD.GUILD_CONFIG
    
    .joinmessage`)
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

client.on("messageReactionAdd", async (reaction, user) => {
  if(user.bot) return;
  let result = await db.get(`${reaction.message.guildId}.GUILD.TICKET.${reaction.message.id}`)
  if(!result) return;
  if(result.channel !== reaction.message.channelId) return;
  if(result.messageID !== reaction.message.id) return;

				if(reaction.message.guild.channels.cache.find(channel => channel.name === `ticket-${user.id}`)) {
					return reaction.users.remove(user);
				}
        reaction.message.guild.channels.create({
					name: `ticket-${user.id}`,
					type: ChannelType.GuildText,
					permissionOverwrites: [
					   {
						 id: reaction.message.guild.roles.everyone,
						 deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] 
				   },
				   {
						id: user.id,
						allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
					}
					],
				  }).then(async channel => {
          reaction.users.remove(user);
          let welcome = new EmbedBuilder()
          .setTitle(`${result.panelName}`)
          .setColor("#3b8f41")
          .setDescription(`Hi ${user.username}, welcome to your ticket! Please be patient, we will be with you shortly. If you would like to close this ticket please run \`/close\``)
          .setFooter({ text: 'iHorizon', iconURL: client.user.displayAvatarURL({ format: 'png', dynamic: true, size: 4096 })})

        return channel.send({embeds: [welcome]});
				});

})
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


client.player.events.on("error", (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the queue`);
});


client.player.events.on("connectionError", (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the connection`);
});

client.player.events.on("trackStart", (queue, track) => {
  queue.metadata.send(`🎵 - Now playing \`${track.title}\` into **${queue.connection.channel.name}** ...`);
});

client.player.events.on("trackAdd", (queue, track) => {
  queue.metadata.send(`:musical_note: - ${track.title} has been added to the queue !`);
});

client.player.events.on("botDisconnect", (queue) => {
  queue.metadata.send("❌ | I was manually disconnected from the voice channel, clearing queue!");
});

client.player.events.on("channelEmpty", (queue) => {
  queue.metadata.send("❌ | Nobody is in the voice channel, leaving...");
});

client.player.events.on("queueEnd", (queue) => {
  queue.metadata.send(`⚠️ - Music stopped as there is no more music in the queue !`);
});