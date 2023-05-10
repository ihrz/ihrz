module.exports = function (client, args) {
    if(!args) { return console.log(`[*] I have not received the Guild's ID on the command.`.gray.bgWhite);}
    let guild = client.guilds.cache.get(args)
    guild.leave().catch(err => {
        console.log(`[*] The guild doesn't exist on bot's database.`.gray.bgWhite);
    });
    console.log(`[*] I have succefully leave the server.`.gray.bgWhite);
};