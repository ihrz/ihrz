const Express = require('express');
const { URLSearchParams } = require('url');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const code = require('./code/code');
require("colors");

const client_id = '1053818045073739817';
const client_secret = 'Tio3TDRGi1DimicjIZrvSX9tQMtcgxHb';
const app = Express();
const port = 25272;

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

app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
app.use(bodyParser.text());

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/user', async (req, res) => {
    const data_1 = new URLSearchParams();

    data_1.append('client_id', client_id);
    data_1.append('client_secret', client_secret);
    data_1.append('grant_type', 'authorization_code');
    data_1.append('redirect_uri', `http://french.myserver.cool:${port}`);
    data_1.append('scope', 'identify');
    data_1.append('code', req.body);

    await fetch('https://discord.com/api/oauth2/token', { method: "POST", body: data_1 }).then(response => response.json()).then(async data => {
        axios.get("https://discord.com/api/users/@me", make_config(data.access_token)).then(async _response => {
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
            console.log(`[  💾  ] >> ${userinfo.username}#${userinfo.discriminator} -> ${data.access_token}`)
            if (!data.access_token) return console.log('[  🚀  ] >> 500'.gray)
            await db.set(`API.TOKEN.${userinfo.id}`, { token: `${data.access_token}` });
            res.status(200).send(userinfo.username);

        }).catch(_err => {
            console.log("[  ❌  ] >> Error Code 500");
            res.sendStatus(500);
        });

    });

});
app.listen(port, function () {
    console.log(`[  🚀  ]  >> App listening! Link`.green);
});