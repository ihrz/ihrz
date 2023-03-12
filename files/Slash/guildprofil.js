module.exports = {
    name: 'guildprofil',
    description: 'Show the guild\'s config',
    run: async (client, interaction) => {
  
        const { 
            Client, 
            Intents, 
            Collection, 
            EmbedBuilder,
            Permissions, 
            ApplicationCommandType, 
            PermissionsBitField, 
            ApplicationCommandOptionType 
          } = require('discord.js');
          
        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({content: ":x: | You must be an administrator of this server! "});
        const { QuickDB } = require("quick.db");
        const db = new QuickDB();
    
        let setchannelsjoin = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.join`)
        let setchannelsleave = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leave`)
        let joinroles = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinroles`);
        let joinDmMessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joindm`)
        let blockpub = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.antipub`)
        let joinmessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.joinmessage`)
        let leavemessage = await db.get(`${interaction.guild.id}.GUILD.GUILD_CONFIG.leavemessage`)

    if(!setchannelsjoin || setchannelsjoin === null){ 
        setchannelsjoin = "No set !"
    }else{setchannelsjoin = `<#${setchannelsjoin}>`}
    
    if(!setchannelsleave || setchannelsleave === null){ 
        setchannelsleave = "No set !"
    }else{setchannelsleave = `<#${setchannelsleave}>`}
    
    if(!joinmessage || joinmessage == null){
        joinmessage = "No set !"
    }
    if(!leavemessage || leavemessage == null){
        leavemessage = "No set !"
    }

    if(!joinroles || joinroles === null){ 
        joinroles = "No set !"
    }else{ joinroles = `<@&${joinroles}>`}
    
    if(!joinDmMessage || joinDmMessage === null){ 
        joinDmMessage = "No set !"
    }
    
    if(blockpub != "on"){
        blockpub = "off"
    }

    let guildp = new EmbedBuilder()
                .setColor("#016c9a")
                .setDescription("`Guild Profil:` "+interaction.guild.name+" !")
                .addFields(
                {name: "Join/Leave Message", value: `**JoinMessage**: ${joinmessage}\n**LeaveMessage**: ${leavemessage}\n`, inline: true},
                {name: "Channels Join/Leave", value:  "**JoinMessageChannel:** "+setchannelsjoin+" \n**LeaveMessageChannel:** "+setchannelsleave+"", inline: true},
                {name: "Join Roles", value: "**JoinRole:** "+joinroles, inline: true},
                {name: "JoinDM", value: `**JoinDmMessage:** ${joinDmMessage}`, inline: true},
                {name: "BlockPub", value: `**AntiPub:** ${blockpub}`, inline: true})
                return interaction.reply({embeds: [guildp]});
}}
