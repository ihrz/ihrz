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
    let i=`${config.asciicrash}\n${err.stack || err.message}`
    CreateFiles.write(i.toString()+'\r\n');
});




const { QuickDB } = require("quick.db");
const db = new QuickDB();


client.on('messageReactionAdd', async (reaction, user) => {
  // Vérifie que la réaction est ajoutée à un message et non à un autre type de message (par exemple une émoticône personnalisée).
  if (!reaction.message.guild) return;

  //Récupère les donner de la bdd
  const fetched = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`)

  if (fetched) {
  // Récupère le rôle que vous souhaitez ajouter à l'utilisateur.
  const role = reaction.message.guild.roles.cache.get(fetched.rolesID);

  // Vérifie que le rôle existe dans le serveur.
  if (!role) return;

  // Récupère le membre (l'utilisateur) qui a ajouté la réaction.
  const member = reaction.message.guild.members.cache.get(user.id);

  // Ajoute le rôle au membre.
  return await member.roles.add(role);
  };

  const fetchedForNitro = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`)

  if (fetchedForNitro) {
    // Récupère le rôle que vous souhaitez ajouter à l'utilisateur.
    const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
  
    // Vérifie que le rôle existe dans le serveur.
    if (!role) return;
  
    // Récupère le membre (l'utilisateur) qui a ajouté la réaction.
    const member = reaction.message.guild.members.cache.get(user.id);
  
    // Ajoute le rôle au membre.
    return await member.roles.add(role);
    };
});


client.on('messageReactionRemove', async (reaction, user) => {
  // Vérifie que la réaction est ajoutée à un message et non à un autre type de message (par exemple une émoticône personnalisée).
  if (!reaction.message.guild) return;

  //Récupère les donner de la bdd
  const fetched = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.name}`)

  if (fetched) {
  // Récupère le rôle que vous souhaitez ajouter à l'utilisateur.
  const role = reaction.message.guild.roles.cache.get(fetched.rolesID);

  // Vérifie que le rôle existe dans le serveur.
  if (!role) return;

  // Récupère le membre (l'utilisateur) qui a ajouté la réaction.
  const member = reaction.message.guild.members.cache.get(user.id);

  // Ajoute le rôle au membre.
  return await member.roles.remove(role);
  };

  const fetchedForNitro = await db.get(`${reaction.message.guildId}.GUILD.REACTION_ROLES.${reaction.message.id}.${reaction.emoji.id}`)

  if (fetchedForNitro) {
    // Récupère le rôle que vous souhaitez ajouter à l'utilisateur.
    const role = reaction.message.guild.roles.cache.get(fetchedForNitro.rolesID);
  
    // Vérifie que le rôle existe dans le serveur.
    if (!role) return;
  
    // Récupère le membre (l'utilisateur) qui a ajouté la réaction.
    const member = reaction.message.guild.members.cache.get(user.id);
  
    // Ajoute le rôle au membre.
    return await member.roles.remove(role);
    };
});

