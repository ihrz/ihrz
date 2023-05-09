/*
broadcast
restart
showlog

*/
const readline = require('readline');
const fs = require("fs");
const wait = require('wait');
require('colors')
const { QuickDB } = require("quick.db");
const db = new QuickDB();
var os = require('os-utils');
const ipify = require('ipify');
const path = require('path');

module.exports = async (client) => {
    console.log(`[*] iHorizon bash terminal is in power on...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon bash terminal is in booting...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon bash terminal is in loading...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon has been loaded !`.gray.bgWhite);

    const now = new Date();

    const options = {
        day: '2-digit', month: 'long',
        year: 'numeric', hour: '2-digit',
        minute: '2-digit', second: '2-digit', timeZone: 'UTC'
    };

    const formattedDate = now.toLocaleDateString('fr-FR', options);
    const LoadFiles = await db.get(`BASH.LAST_LOGIN`) || "None"
    const LoadFiles2 = "127.0.0.1";

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const filePath = path.join(process.cwd(), 'files', 'bash', 'history', '.bash_history');
    const createFiles = fs.createWriteStream(filePath, { flags: 'a' });

    let lineNumber = 1; // Initialiser le compteur à 1
    
    console.log(`Welcome to iHorizon Bash

 * Documentation:  https://github.com/Kisakay/ihrz/

  System information as of mar.  ${formattedDate}
  Memory usage:                  ${os.freememPercentage()}%
  IPv4 address for eth0:         ${await ipify({ useIPv6: false })}
  IPv6 address for eth0:         ${await ipify({ useIPv6: true }) || "None"}


Last login: ${LoadFiles} from ${LoadFiles2}`)
    input();

    const now2 = new Date();
    const year = now2.getFullYear().toString().substr(-2);
    const month = now2.toLocaleString('default', { month: 'short' });
    const day = now2.toLocaleString('default', { day: '2-digit' });
    const time = now2.toLocaleTimeString('en-US', { hour12: false });

    const dateStr = `${day} ${month} ${year} ${time} 2023`;
    await db.set(`BASH.LAST_LOGIN`, dateStr.toString());

    async function input() {
        rl.question('kisakay@ihorizon'.green + ":".white + "~".blue + "$ ".white, (name) => {
            output(name)
        });
    }

    async function output(name) {
        const CreateFiles = fs.createWriteStream(`${process.cwd()}/files/bash/history/.bash_history`, { flags: 'a' });
        createFiles.write(`   ${lineNumber}  ${name}\r\n`);
        lineNumber++; // Incrémenter le compteur de ligne
        switch (name.split(" ")[0]) {
            case "help":
                console.log(`iHorizon bash,
These shell commands are defined internally.  Type 'help' to see this list.

 help                                         Show this message
 broadcast                                    Send a message to all of iHorizon guild
 shutdown                                     Shutdown the bot
 history                                      Show the bash history
`)
                break;
            case "shutdown":
                console.log(`[*] Shuting down..`.gray.bgWhite);
                await wait(800);
                console.log(`[*] Unload all script...`.gray.bgWhite);
                await wait(1000);
                console.log(`[*] All are successfully unloaded`.gray.bgWhite);
                process.exit(0);
                break;
            case "broadcast":
                const args = name.split(" ");
                console.log("-> " + args.join(" "));
                break;
            case "history":
                fs.readFile(filePath, 'utf-8', (err, data) => {
                    if (err) throw err;
                    console.log(data);
                  });
                break;
            default:
                console.log("Unknow command please refear with the help commands")
        }

        input()
    };
};