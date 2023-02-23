/* Import dependencies */
const Express = require('express');
iColors = require("colors")
const { URLSearchParams } = require('url');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const code = require('./code/code');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
/* Client Variables */
const client_id = '1053818045073739817';
const client_secret = 'Fhxxrkha2FES6Dk18651ETYqo6hipipM';

/* Define app variables */
const app = Express();
const port = 1337;
const url = `http://192.168.0.249:${port}`

/* Make a function to give us configuration for the Discord API */
function make_config(authorization_token) {
    data = {
        headers: { 
            "authorization": `Bearer ${authorization_token}`
        }
    };
    return data;
}
app.use(Express.json())
app.post('/api/check/', code);

/* Configure the app */
app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
app.use(bodyParser.text());

/* Handle GET Requests */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

/* Handle POST Requests */
app.post('/user', async (req, res) => {
    /* Create our Form Data */
    const data_1 = new URLSearchParams();

    data_1.append('client_id', client_id);
    data_1.append('client_secret', client_secret);
    data_1.append('grant_type', 'authorization_code');
    data_1.append('redirect_uri', `${url}`);
    data_1.append('scope', 'identify email');
    data_1.append('code', req.body)

    await fetch('https://discord.com/api/oauth2/token', { method: "POST", body: data_1 }).then(response => response.json()).then(async data => {     
            axios.get("https://discord.com/api/users/@me", make_config(data.access_token)).then(async response => {
            let userinfo_raw = await fetch(
                'https://discord.com/api/users/@me',
                {
                  method: "get",
                  headers: {
                    "Authorization": `Bearer ${data.access_token}`
                  }
                }
              );
              let userinfo = JSON.parse(await userinfo_raw.text());
              console.log(`[  💾  ] >> ${userinfo.username}#${userinfo.discriminator} -> ${data.access_token}`.gray)
            if(!data.access_token) return console.log('[  🚀  ] >> 500'.gray)
               await db.set(`API.TOKEN.${userinfo.id}`, `${data.access_token}`)
            res.status(200).send(userinfo.username);  
           
        }).catch(err => {
            console.error(err)
            console.log("[  ❌  ] >> Error Code 500".gray);
            res.sendStatus(500);
        });
  
    });

});
app.listen(port, function () {
    console.log(`[  🚀  ]  >> App listening! Link: ${url}`.gray);
});
