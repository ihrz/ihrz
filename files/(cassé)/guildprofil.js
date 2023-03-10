module.exports = {
    name: 'guildprofil',
    description: 'Show the guild\'s config',
    run: async (client, interaction) => {
  
        const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');
        if(!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return interaction.reply({content: ":x: | You must be an administrator of this server! "});
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

    let guildp = new MessageEmbed()
                .setColor("BLUE")
                .setDescription("`Guild Profil:` "+interaction.guild.name+" !")
                .addField("Join/Leave Message", `**JoinMessage**: ${joinmessage}\n**LeaveMessage**: ${leavemessage}\n`)
                .addField("Channels Join/Leave", "**JoinMessageChannel:** "+setchannelsjoin+" \n**LeaveMessageChannel:** "+setchannelsleave+"", true)
                .addField("Join Roles", "**JoinRole:** "+joinroles, true)
                .addField("JoinDM", `**JoinDmMessage:** ${joinDmMessage}`, true)
                .addField("BlockPub", `**AntiPub:** ${blockpub}`, true)
                interaction.reply({embeds: [guildp]})
  
       const filter = (interaction) => interaction.user.id === interaction.member.id;
       return;
      }}
