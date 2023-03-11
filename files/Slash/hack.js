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

module.exports = {
    name: 'hack',
    description: 'hack someone !',
    options: [
        {
            name: "user",
            type: ApplicationCommandOptionType.User,
            description: "The user you want to hack",
            required: true
        }
    ],
    run: async (client, interaction) => {
    
    const kiss = interaction.options.getUser("user")
    if(!kiss) return interaction.send(`I don't find user !`);
    var ip = [
        '1',
        '100',
        '168',
        '254',
        '345'

    ];
    var Email = [
        'iloveloli@gmail.com',
        'p0rnisth3b3st@gmail.com',
        'zckz0ck@gmail.com',
        'bruhmoment@gmail.com',
        'elhaxor1337@anonymail.ru'
    ];
    var mdp = [
        'sxmfg22',
        'pifpaf44',
        'ursoxko332',
        'password223',
        'roblox556',
        '123'
    ];

    const embed = new EmbedBuilder()
        .setColor("#800000")
        .setDescription(`<@${kiss.id}>`+` hacked by <@${interaction.user.id}> !`)
        .addFields({name: "IP", value: `\`${ip[Math.floor(Math.random()*ip.length)]}.${ip[Math.floor(Math.random()*ip.length)]}.${ip[Math.floor(Math.random()*ip.length)]}.${ip[Math.floor(Math.random()*ip.length)]}\``},
        {name: "Email", value: `\`${Email[Math.floor(Math.random()*Email.length)]}\``},
        {name: "Password", value: `\`${mdp[Math.floor(Math.random()*mdp.length)]}\``})
        .setTimestamp()

    return interaction.reply({embeds: [embed]});    
}};