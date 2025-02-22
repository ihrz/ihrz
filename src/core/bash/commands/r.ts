/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BashCommands } from "../../../../types/bashCommands.js";
import { spawn } from "child_process";

export const command: BashCommands = {
    command_name: "r",
    command_description: "Run a bash command",
    run: async function (client, stream, args) {
        if (!args.length) {
            stream.write("Usage: r <command> [args...]\n");
            return;
        }

        const rl = (stream as any)._rl;
        const originalPrompt = rl?.getPrompt();
        let isCleanedUp = false;

        const cmd = spawn(args[0], args.slice(1), {
            cwd: process.cwd(),
            shell: true,
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        cmd.stdout.pipe(stream as any, { end: false });
        cmd.stderr.pipe(stream as any, { end: false });

        function handleInput(data: Buffer) {
            const input = data.toString();
            if (input === '\x03') {
                cmd.kill('SIGINT');
                stream.write('^C\n');
                cleanup();
                return;
            }

            if (!cmd.killed && cmd.stdin.writable) {
                cmd.stdin.write(data);
            }
        }

        stream.on('data', handleInput);

        async function cleanup() {
            if (isCleanedUp) {
                return;
            }

            isCleanedUp = true;

            if (!cmd.killed) {
                cmd.kill('SIGINT');
            }
            cmd.stdout.unpipe(stream as any);
            cmd.stderr.unpipe(stream as any);
            cmd.stdin.end();
            stream.removeListener('data', handleInput);

            await new Promise(resolve => setTimeout(resolve, 50));
            await new Promise(resolve => setTimeout(resolve, 50));

            if (rl) {
                rl.setPrompt(originalPrompt || '');
                stream.write('\r\n');
                rl.prompt(true);
            }
        }
    }
};