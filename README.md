# Official iHorizon Repo

iHorizon is a Discord bot written in [TypeScript](https://www.typescriptlang.org/) and using [pwss](https://npmjs.com/pwss) !
iHorizon have a large variety of features, including moderation, invite management, guild configuration, fun commands, music playback, giveaways, backup and lot more!

[![npm version](https://badge.fury.io/js/ihrz.svg)](https://badge.fury.io/js/ihrz)
![NPM Downloads](https://img.shields.io/npm/dm/ihrz)
![GitHub Release](https://img.shields.io/github/v/release/ihrz/ihrz)
![GitHub Repo stars](https://img.shields.io/github/stars/ihrz/ihrz)
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

## Contributor's Wall

- [Kisakay](https://github.com/Kisakay) (She/Her)
- [NayaWeb](https://github.com/belugafr) (She/Her)
- [Noémie](https://github.com/name-shitty-github-profile) (She/Her)
- [Maxine](https://github.com/mxi1n) (She/Her)
- [Wyene](https://github.com/tryedandcatched) (He/Him)

## Origin

The bot was primarily developed by Kisakay and was first released in **September 2020** using **discord.js** v12 and now use pwss, yeah !
Now, It has a strong architecture with separated modules, each with their own owner directory.

## Is it Free ?

The iHorizon project is licensed under the  [`CC BY-NC-SA 4.0`](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

**Is allowed to :**

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

**Is unallowed to :**

- **Attribution** — You must give [appropriate credit](https://creativecommons.org/licenses/by-nc-sa/4.0/), provide a link to the license, and [indicate if changes were made](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- **NonCommercial** — You may not use the material for [commercial purposes](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the [same license](https://creativecommons.org/licenses/by-nc-sa/4.0/) as the original.
- **No additional restrictions** — You may not apply legal terms or [technological measures](https://creativecommons.org/licenses/by-nc-sa/4.0/) that legally restrict others from doing anything the license permits.

# How to selfhost ?

_There are only some few software needed :_

- [NodeJS](https://nodejs.org) (**20 or higher required**)
- [Npm](https://npmjs.com) (**With NodeJS**)

### How to configure the bot ?

* Open [config.example.ts](https://github.com/ihrz/ihrz/blob/dev/src/files/config.example.ts) in file Editor (Notepad, VSCode...), enter your informations, and rename to config.ts.

After your configuration in the config.ts :

## Linux & Mac os

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
Used by more than 540 servers!
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
