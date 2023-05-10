const wait = require('wait');
require('colors')
const { QuickDB } = require("quick.db");
const db = new QuickDB();
var os = require('os-utils');
const ipify = require('ipify');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

module.exports = async (client) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const now2 = new Date();
    const year = now2.getFullYear().toString().substr(-2);
    const month = now2.toLocaleString('default', { month: 'short' });
    const day = now2.toLocaleString('default', { day: '2-digit' });
    const time = now2.toLocaleTimeString('en-US', { hour12: false });

    console.log(`[*] iHorizon bash terminal is in power on...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon bash terminal is in booting...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon bash terminal is in loading...`.gray.bgWhite);
    await wait(1000);
    console.log(`[*] iHorizon has been loaded !`.gray.bgWhite);

    const now = new Date();

    const options = {
        day: '2-digit', month: 'long',year: 'numeric', hour: '2-digit',
        minute: '2-digit', second: '2-digit', timeZone: 'UTC'
    };

    const formattedDate = now.toLocaleDateString('fr-FR', options);
    const LoadFiles = await db.get(`BASH.LAST_LOGIN`) || "None"
    const LoadFiles2 = "127.0.0.1";

    const filePath = path.join(process.cwd(), 'files', 'bash', 'history', '.bash_history');
    const createFiles = fs.createWriteStream(filePath, { flags: 'a' });

    const dateStr = `${day} ${month} ${year} ${time} 2023`;
    await db.set(`BASH.LAST_LOGIN`, dateStr.toString());
    console.log(`Welcome to iHorizon Bash

* Documentation:  https://github.com/Kisakay/ihrz/

 System information as of mar.  ${formattedDate}
 Memory usage:                  ${os.freememPercentage()}%
 IPv4 address for eth0:         ${await ipify({ useIPv6: false })}
 IPv6 address for eth0:         ${await ipify({ useIPv6: true }) || "None"}


Last login: ${LoadFiles} from ${LoadFiles2}`)

    rl.setPrompt('kisakay@ihorizon'.green + ":".white + "~".blue + "$ ".white);
    rl.prompt();
    rl.on('line', (line) => {
        const [commandName, ...args] = line.trim().split(' ');

        const commandPath = `${process.cwd()}/files/bash/commands/${commandName}.js`;
        if (fs.existsSync(commandPath)) {
            const command = require(commandPath);
            command(client, args.join(' '));

            var data = fs.readFileSync(filePath);
            var res = data.toString().split('\n').length;
            if (commandName) { createFiles.write(`   ${res}  ${line}\r\n`); };
        } else {
            if(!commandName) { } else{console.log(`Command not found: ${commandName}`);};
        }
        rl.prompt();
    });

    process.on('SIGINT', () => {
        console.log(`\n[*] Please shutdown with the command the next time`.gray.bgWhite)
        process.exit(0);
    });  // CTRL+C
    process.on('SIGQUIT', () => {
        console.log(`\n[*] Please shutdown with the command`.gray.bgWhite)
        process.exit(0);
    }); // Keyboard quit
};  