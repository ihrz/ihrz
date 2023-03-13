const { 
    Client, 
    Intents, 
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions, 
    ApplicationCommandType, 
	PermissionFlagsBits,
    PermissionsBitField, 
    ApplicationCommandOptionType 
  } = require('discord.js');


module.exports = {
		name: 'new',
		description: 'Open a ticket if the ticket module is enable on the guild',
		run: async (client, interaction) => {
	  
			const { QuickDB } = require("quick.db");
			const db = new QuickDB();
			let blockQ = await db.get(`${interaction.user.id}.GUILD.TICKET.on_or_off`)

						if(blockQ === true) {
						
								return interaction.reply("You can't use this commands because an Administrator disable the ticket commands !") 
							
						}
				if(interaction.guild.channels.cache.find(channel => channel.name === `ticket-${interaction.user.id}`)) {
					return interaction.reply('You already have a ticket, please close your existing ticket!!');
				}
				interaction.guild.channels.create({
					name: `ticket-${interaction.user.id}`,
					type: ChannelType.GuildText,
					permissionOverwrites: [
					   {
						 id: interaction.guild.roles.everyone,
						 deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] 
				   },
				   {
						id: interaction.user.id,
						allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
					}
					],
				  }).then(async channel => {
					interaction.reply(`You have create a ticket succefully ! View this: ${channel}`);
					channel.send(`Hi ${interaction.user.username}, welcome to your ticket! Please be patient, we will be with you shortly. If you would like to close this ticket please run \`/close\``);
				});
		  const filter = (interaction) => interaction.user.id === interaction.member.id;
		  }}