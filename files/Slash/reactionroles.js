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

const yaml = require('js-yaml'), fs = require('fs');
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
    let fileContents = fs.readFileSync(process.cwd() + "/files/lang/en-US.yml", 'utf-8');
    let data = yaml.load(fileContents);

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: data.reactionroles_dont_admin_added });
    }
    let type = interaction.options.getString("value")
    let messagei = interaction.options.getString("messageid")
    let reaction = interaction.options.getString("reaction")
    let role = interaction.options.getRole("role")

    let help_embed = new EmbedBuilder()
      .setColor("#0000FF")
      .setTitle("/reactionroles Help !")
      .setDescription(data.reactionroles_embed_message_description_added)

    if (type == "add") {
      interaction.channel.messages.fetch(messagei).then(message => { message.react(reaction) })
        .catch(error => { return interaction.reply({ content: `${error}` }) });

      if (!role) { interaction.reply({ embeds: [help_embed] }) };

      if (!reaction) { return interaction.reply({ content: data.reactionroles_missing_reaction_added }) }

      let check = reaction.toString()

      if (check.includes("<") || check.includes(">") || check.includes(":")) {
        return interaction.reply({ content: data.reactionroles_invalid_emote_format_added })
      }

      await db.set(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`, { rolesID: role.id, reactionNAME: reaction, enable: true })

      try {
        logEmbed = new EmbedBuilder()
          .setColor("#bf0bb9")
          .setTitle(data.reactionroles_logs_embed_title_added)
          .setDescription(data.reactionroles_logs_embed_description_added
              .replace("${interaction.user.id}", interaction.user.id)
              .replace("${messagei}", messagei)
              .replace("${reaction}", reaction)
              .replace("${role}", role)
        )
        let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
        if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
      } catch (e) { console.error(e) };

      interaction.reply({
        content: data.reactionroles_command_work_added
          .replace("${messagei}", messagei)
          .replace("${reaction}", reaction)
          .replace("${role}", role)
        , ephemeral: true
      })
    } else {

      if (type == "remove") {
        let reactionLet = interaction.options.getString("reaction")

        if (!reactionLet) { return interaction.reply({ content: data.reactionroles_missing_remove }) }
        const message = await interaction.channel.messages.fetch(messagei);
        const fetched = await db.get(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)
        if (!fetched) { return interaction.reply({ content: data.reactionroles_missing_reaction_remove }) }
        const reactionVar = message.reactions.cache.get(fetched.reactionNAME);

        if (!reactionVar) { return interaction.reply({ content: data.reactionroles_cant_fetched_reaction_remove }) }
        await reactionVar.users.remove(client.user.id).catch(err => { console.error(err) });


        await db.delete(`${interaction.guild.id}.GUILD.REACTION_ROLES.${messagei}.${reaction}`)

        try {
          logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(data.reactionroles_logs_embed_title_remove)
            .setDescription(data.reactionroles_logs_embed_description_remove
              .replace("${interaction.user.id}", interaction.user.id)
              .replace("${messagei}", messagei)
              .replace("${reaction}", reaction)
            )
          let logchannel = interaction.guild.channels.cache.find(channel => channel.name === 'ihorizon-logs');
          if (logchannel) { logchannel.send({ embeds: [logEmbed] }) }
        } catch (e) { console.error(e) };
        await interaction.reply({
          content: data.reactionroles_command_work_remove
            .replace("${reaction}", reaction)
            .replace("${messagei}", messagei)
          , ephemeral: true
        })
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
  }
}
