import fs from 'node:fs';
import toml from 'toml';
function emojis(client) {
    let emojis = toml.parse(fs.readFileSync(process.cwd() + "/src/files/emojis.toml", 'utf-8'));
    client.iHorizon_Emojis = emojis;
}
;
export default emojis;
