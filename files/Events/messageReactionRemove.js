
const { Client, Intents, Collection, EmbedBuilder, Permissions } = require('discord.js');
const config = require('../config.json');
const fs = require("fs")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = async (client, reaction, user) => { 
try{
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
  }catch(e){ console.log(e)};
}