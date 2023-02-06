const couleurmdr = require("colors"),
    { QuickDB } = require("quick.db"),
    db = new QuickDB(),
    config = require("../config.json"),
    register = require('../slashsync');
//dev by ezermoz
module.exports = async (client) => {
  await register(client, client.register_arr.map((command) => ({
    name: command.name,
    description: command.description,
    options: command.options,
    type: 'CHAT_INPUT'
  })), {
    debug: true
  });
async function term() {
    console.log(
    "    _ __  __           _                 \n".cyan+"   (_) / / /___  _____(_)___  ____  ____ \n".cyan+
    "  / / /_/ / __ \\/ ___/ /_  / / __ \\/ __ \\\n".cyan+" / / __  / /_/ / /  / / / /_/ /_/ / / / /\n".cyan+
    "/_/_/ /_/\\____/_/  /_/ /___/\\____/_/ /_/\n".cyan), console.log("[".yellow," 💾 ".green,"] >> ".yellow,"Dev by Ezermoz".blue)
  }
  term(), client.user.setPresence({ activities: [{ name: 'Powered by the iHorizon Project' }] }),
  await db.set(`GLOBAL.OWNER.${config.ownerid1}`, {owner: true})
}