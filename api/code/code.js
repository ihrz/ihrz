const { QuickDB } = require('quick.db');
const db = new QuickDB();
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

module.exports = async (req, res) => {
        const {tokent, userid, tor, adminKey } = req.body
        if(!userid || !adminKey) return console.log("-> Bad json request without ip/key")
        if(!tor == 'CHECK_IN_SYSTEM') {
            console.log('-> Bad json requests without options')
            return res.send('-> Bad json requests without options')
        }
        if(tor == "CHECK_IN_SYSTEM"){
            const {userid, adminKey, tokent} = req.body
            if(!userid || !adminKey) return console.log("-> Bad json request without ip/key")
            if(adminKey != "/LqeKkYaR5995|k<^2jjznw3)UN7tieeU5gZ8AMQry39~U)5-W=ZM3/Y4Mnkz4PCN387J&HKb]hAsPSV9M/8#!BZ@5^!3qmjt5X3F89yY,8E+555x8J,.e&H47&bZ:sbdD6K48|,*]99df.>87qWv5p43B=5Uj[tD679cDY]>.c>7t_#tUQUcF,>twC)#F>4Tv3!dR7Kw8{3nigh4,7W6jnDxE${=kQU~3Y*&x7xdG2=-[y9,w:4xg26D8Qkj>*94C3m364,Z[nU)=z(5JH*dvC-!jN#Z7#,%^NCgt87p4e6#?S@&Y9V3E3kn6{i9C6n;JR<u=<9!4{.Qp/,&H4Vv#R4ZA{Y.m6#h9etE4NF2,74Nj6uZznY") return
            let value = await db.get(`API.TOKEN.${userid}`)
            if(!value){ return res.json({available: "no", id: userid, adminKey: "ok"});}
            try{
                await oauth.getUser(value)
                res.json({connectionToken: value, available: "yes", id: userid, adminKey: "ok"})
            }catch{
                await db.delete(`API.TOKEN.${userid}`)
                res.json({available: "no", id: userid, adminKey: "ok"})
                return
                }
            }
            return
}
