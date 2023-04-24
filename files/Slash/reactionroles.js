const {
  Client,
  Intents,
  Collection,
  ChannelType,
  EmbedBuilder,
  Permissions,
  ApplicationCommandType,
  PermissionsBitField,
  ApplicationCommandOptionType
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
  name: 'reactionroles',
  description: 'Set a roles when user react to a message with specific emoji',
  options: [
    {
      name: "value",
      description: "Please make your choice.",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Add another",
          value: "add"
        },
        {
          name: "Remove one",
          value: "remove"
        },
        {
          name: "Show all from message",
          value: "list"
        }
      ]
    },
    {
      name: 'messageid',
      type: ApplicationCommandOptionType.String,
      description: `Please copy the identifiant of the message you want to configure`,
      required: true
    },
    {
      name: 'reaction',
      type: ApplicationCommandOptionType.String,
      description: `The emoji you want`,
      required: false
    },
    {
      name: 'role',
      type: ApplicationCommandOptionType.Role,
      description: `The role you want to configure`,
      required: false
    }
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply(":x: | You must be an administrator of this server to request a welcome channels commands!");
    let type = interaction.options.getString("value")
    let messagei = interaction.options.getString("messageid")
    let reaction = interaction.options.getString("reaction")
    let role = interaction.options.getRole("role")

    let help_embed = new EmbedBuilder()
      .setColor("#0000FF")
      .setTitle("/reactionroles Help !")
      .setDescription(`__how to use ?__
/rolesreaction add \`<message id>\` \`<reaction>\` \`<rolesid>\`
/rolesreaction remove \`<message id>\` \`<reaction>\`
/rolesreaction list \`<message id>\``)

    if (type == "add") {
      /* Add roles to users pleasssssssse ihorisus*/

      interaction.channel.messages.fetch(messagei).then(message => { message.react(reaction) })
        .catch(error => { return interaction.reply({ content: `${error}` }) });

      if (!role) { interaction.reply({ embeds: [help_embed] }) }
      if (!reaction) { return interaction.reply({ content: `Missing argument: Reaction's Emoji` }) }

      let check = reaction.toString()
      if (check.includes("<") || check.includes(">") || check.includes(":")) { return interaction.reply({ content: `❌ You can't sent to me a \`CUSTOM_EMOJI\` in format \`<::xxx>\` ! I need only them ID !` }) }
      await db.set(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`, { rolesID: role.id, reactionNAME: reaction, enable: true })

      try {
        logEmbed = new EmbedBuilder()
          .setColor("#bf0bb9")
          .setTitle("ReactionRoles Logs")
          .setDescription(`<@${interaction.user.id}> set a reaction roles: Message: \`${messagei}\` | Reaction: \`${reaction}\` | Role: ${role}`)
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
      } catch (e) { console.error(e) };

      interaction.reply({ content: `${reaction} has been added to the ${messagei}'s message to give ${role}`, ephemeral: true })
      /* End of add roles to users pleasssssssse horisus*/

    } else {
      if (type == "remove") {
        /* Remove roles to users pleasssssssse horisus*/
        let reactionLet = interaction.options.getString("reaction")

        if (!reactionLet) { return interaction.reply({ content: `Missing argument: Reaction's Emoji` }) }

        const message = await interaction.channel.messages.fetch(messagei);

        const fetched = await db.get(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)

        if (!fetched) { return interaction.reply({ content: "Reaction Roles don't found on my database..." }) }

        const reactionVar = message.reactions.cache.get(fetched.reactionNAME);

        if (!reactionVar) { return interaction.reply({ content: `Can't fetch targeted reaction on this message !` }) }
        await reactionVar.users.remove(client.user.id).catch(err => { console.error(err) });


        await db.delete(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)

        try {
          logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle("ReactionRoles Logs")
            .setDescription(`<@${interaction.user.id}> delete a reaction roles: Message: \`${messagei}\` | Reaction: \`${reaction}\``)
          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { console.error(e) };
        await interaction.reply({ content: `${reaction} has been deleted to the ${messagei}'s message`, ephemeral: true })

        /*End of Remove roles to users pleasssssssse horisus*/
      }
    }
    /*if(type == "list"){
    let reactionLet = interaction.options.getString("reaction")
    
    if(!reactionLet) { return interaction.reply({content: `Missing argument: Reaction's Emoji`})}
    
    const message = await interaction.channel.messages.fetch(messagei);
    
    const fetched = await db.get(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)
    
    if(!fetched) { return interaction.reply({content: "Reaction Roles don't found on my database..."})}
    
    const reactionVar = message.reactions.cache.get(fetched.reactionNAME);
    
    await reactionVar.users.remove(client.user.id);
    
    await interaction.reply({content: `${reaction} has been deleted to the ${messagei}'s message`, ephemeral: true})
    
    await db.delete(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)
       
      try{
        logEmbed = new EmbedBuilder()
        .setColor("PURPLE")
        .setTitle("ReactionRoles Logs")
        .setDescription(`<@${interaction.user.id}> delete a reaction roles: Message: \`${messagei}\` | Reaction: \`${reaction}\``)
                let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
                if(logchannel) { logchannel.send({embeds: [logEmbed]}) }
                }catch(e) { console.error(e) };
      }*/
    if (type == "list") {
      interaction.reply({ content: `⚙️ - Work In Progress` })
    }
    if (!type) {
      return interaction.reply({ embeds: [help_embed] })
    }
    if (!messagei) {
      return interaction.reply({ embeds: [help_embed] })
    }

    const filter = (interaction) => interaction.user.id === interaction.member.id;
  }
}
