module.exports = {
        name: 'blacklist',
        description: 'Blacklist a user on the bot (must be owner of the bot)',
        options: [
            {
                name: 'member',
                type: 'USER',
                description: 'The user you want to blacklist...',
                required: false
            }
        ],
        run: async (client, interaction) => {
            const { Client, Intents, Collection, MessageEmbed, Permissions } = require('discord.js');

    
            const { QuickDB } = require("quick.db");
            const db = new QuickDB();
              let owner_pp_user = await db.get(`GLOBAL.OWNER.${interaction.user.id}.owner`)
        
                    if(!owner_pp_user || owner_pp_user === null || owner_pp_user === false){
        
                
                        const block_antiowner = new MessageEmbed()
                        .setTitle(":no_entry: Your are not owner !")
                        .setDescription("**"+interaction.user.username+"** you cannot use this command with your current privilege !")
                        .setTimestamp()
                        .setColor("#2f3136")
                        .setFooter(`${interaction.user.username}`)
                        return interaction.reply({embeds: [block_antiowner]})
                    }
        
                
                  
                    var text = ""
                    const ownerList = await db.all()
                    for (var i in ownerList[0].value.BLACKLIST){
                        text += `<@${i}>\n`
                        }

                        let embed = new MessageEmbed()
                        .setColor('#2E2EFE')
                        .setAuthor('Blacklist')
                        .setDescription(text)
                        .setFooter('1/1 iHorizon')
                        const member = interaction.options.getMember('member')
                        if (!member) return interaction.reply({embeds: [embed]});
            
        if(member.user.id === client.user.id) return interaction.reply({content: "can't blacklist myself x)"})
        
          
                   let fetched = await db.get(`GLOBAL.BLACKLIST.${member.user.id}`)
        
                 if (!fetched) {
                       await db.set(`GLOBAL.BLACKLIST.${member.user.id}`, {blacklisted: true})
                       if(member.bannable){
                        member.ban({ reason: "blacklisted !"})
                        return interaction.reply(`${member.user.username} is now blacklisted`);

                       }else{
                        return interaction.reply("❌ Is now blacklisted, Can't ban this member here, missing permission?")
                       }

                 } 
          const filter = (interaction) => interaction.user.id === interaction.member.id;
          }}