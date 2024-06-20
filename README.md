# Official iHorizon Repo

iHorizon is a Discord bot written in [TypeScript](https://www.typescriptlang.org/) and using [pwss](https://npmjs.com/pwss) !
IHorizon have a large variety of features, including moderation, invite management, guild configuration, fun commands, music playback, giveaways, backup and lot more!

## Languages

* English
* French
* Rude French (Troll)
* Italian
* German
* Japanese
* Spanish
* Russian
* Portuguese
* And soon more !

## Contributor's Wall

- [Kisakay](https://github.com/Kisakay) (She/Her)
- [NayaWeb](https://github.com/belugafr) (She/Her)
- [Noémie](https://github.com/name-shitty-github-profile) (She/Her)
- [Maxine](https://github.com/mxi1n) (She/Her)
- [Wyene](https://github.com/WyeneCloud) (He/Him)

## Is it Free ?

The iHorizon project is licensed under the  [`Creative Commons Attribution-NonCommercial-ShareAlike 2.0`](https://creativecommons.org/licenses/by-nc-sa/2.0/) license.

## How to configure the module ?
### Linux & Mac os & Windows

### Install the module
```bash
# Npm
npm install ihrz

# Yarn
yarn add ihrz

# Bun
bun add ihrz

...
```
#### index.js
```ts
import { iHorizonBuilder } from 'ihrz';

new iHorizonBuilder({
    discord: {
        token: "Discord Bot Token",
        phonePresence: false
    },
    lavalink: {
        nodes: [
            {
                id: "Node ID",
                host: "Node Host",
                port: 2333,
                authorization: "Node Password",
            }
        ],
    },
    core: {
        devMode: true,
        bash: false,
        blacklistPictureInEmbed: "An png url",
        guildLogsChannelID: "The Discord Channel's ID for logs when guildCreate/guildRemove",
        reportChannelID: "The Discord Channel's ID for logs when bugs/message are reported",
        cluster: ["http://localhost:9030"],
        shutdownClusterWhenStop: false
    },
    command: {
        alway100: []
    },
    owner: {
        ownerid1: "Owner 1 ID",
        ownerid2: "Owner 2 ID",
    },
    api: {
        apiToken: "my-super-api-token-between-ihorizon-and-clusterManager",
        clientID: ""
    },
    console: {
        emojis: {
            OK: "✅", ERROR: "❌", HOST: "💻", KISA: "👩", LOAD: "🔄"
        }
    },
    database: {
        method: 'SQLITE',
        mongoDb: "mongodb://ihrz:1337/iHorizonDB",
        mySQL: {
            host: '',
            password: '',
            database: '',
            user: '',
            port: 25570
        },
    }
}).start();
```
#### package.json

Very Important!! package.json need to have type: module!

```json
{
  "dependencies": {
    "ihrz": "latest"
  },
  "type": "module"
}
```

### Run the bot

```bash
node index.js
```
# About the bot
IHorizon is trusted by more than **275 000** users!<br>
Used by more than 450 servers!
<br>
Certified by discord and had even more than 75 servers before starting the verification process!

To join the Official Discord Support Server, please visit our website at [Official Server Link](http://discord.ihorizon.me/) or click on this link: [Other Link](https://discord.gg/ZpBPGNsAsu).
To invite the official Discord bot, please click on this link: [Click Here](https://discord.com/api/oauth2/authorize?client_id=945202900907470899&permissions=8&scope=bot).

If you have any questions or concerns, you can contact the owner via Discord at 2h0.

# About the owner

**Kisakay** has not changed their identity, but has simply embraced who they truly are as a person. She now goes by she/her pronouns.

In the `LICENSE` files, the name `Anaïs Saraiva` is the name of the owner.

## Remarks

Any sorts of hate trowards any contributor will not be tolerated.
Regardless of the type and the level of hate.
