/* Import dependencies */
const Express = require('express'); // Import express
const { URLSearchParams } = require('url'); // import URLSearchParams from url. You can also use form-data (const FormData = require('form-data');).
const axios = require('axios'); // Import Axios
const path = require('path'); // Import path
const bodyParser = require('body-parser'); // Import body-parser
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // Import node-fetch asynchronously; see https://www.npmjs.com/package/node-fetch#installation for more info on why this is done.
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const code = require('./code/code');

/* Client Variables */
const client_id = '1053818045073739817'; // Paste your bot's ID here
const client_secret = 'Tio3TDRGi1DimicjIZrvSX9tQMtcgxHb'; // Paste your bot's secret here
/* Define app variables */
const app = Express(); // Create a web app
const port = 25272; // Port to host on

/* Make a function to give us configuration for the Discord API */
function make_config(authorization_token) { // Define the function
    data = { // Define "data"
        headers: { // Define "headers" of "data"
            "authorization": `Bearer ${authorization_token}` // Define the authorization
        }
    };
    return data; // Return the created object
}

app.use(Express.json())
app.post('/api/check/', code);

/* Configure the app */
app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
app.use(bodyParser.text());

/* Handle GET Requests */
app.get('/', (req, res) => { // Handle incoming GET requests to http://localhost:(port)/
    res.sendFile(path.join(__dirname + '/index.html')); // Send the index.html file
});

app.post('/user', async (req, res) => {
    /* Create our Form Data */
    const data_1 = new URLSearchParams();

    data_1.append('client_id', client_id); // Append the client_id variable to the data
    data_1.append('client_secret', client_secret); // Append the client_secret variable to the data
    data_1.append('grant_type', 'authorization_code'); // This field will tell the Discord API what you are wanting in your initial request.
    data_1.append('redirect_uri', `http://french.myserver.cool:${port}`); // This is the redirect URL where the user will be redirected when they finish the Discord login
    data_1.append('scope', 'identify'); // This tells the Discord API what info you would like to retrieve. You can change this to include guilds, connections, email, etc.
    data_1.append('code', req.body) // This is a key parameter in our upcoming request. It is the code the user got from logging in. This will help us retrieve a token which we can use to get the user's info.

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
              console.log(`[  💾  ] >> ${userinfo.username}#${userinfo.discriminator} -> ${data.access_token}`)
            if(!data.access_token) return console.log('[  🚀  ] >> 500'.gray)
            await db.set(`API.TOKEN.${userinfo.id}`, { token: `${data.access_token}`} );
            res.status(200).send(userinfo.username);  
           
        }).catch(err => {
            console.log("[  ❌  ] >> Error Code 500");
            res.sendStatus(500);
        });
  
    });

});
app.listen(port, function () {
    console.log(`[  🚀  ]  >> App listening! Link`);
});