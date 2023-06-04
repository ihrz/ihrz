/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

module.exports.backup = {
    "backup": {
        name: 'backup',
        description: 'Manage, create and delete a guild backups !',
    },
}

module.exports.bot = {
    "botinfo": {
        name: 'botinfo',
        description: 'Get information about the bot!',
    },
    "help": {
        name: 'help',
        description: 'Get a list of all the commands!',
    },
    "invite": {
        name: 'invite',
        description: 'Get the bot invite link!',
    },
    "kisakay": {
        name: 'kisakay',
        description: 'Get necessary information about my developer, Kisakay',
    },
    "ping": {
        name: 'ping',
        description: 'Get the bot latency!',
    },
    "setserverlang": {
        name: 'setserverlang',
        description: 'Set the server language!',
    },
    "status": {
        name: 'status',
        description: 'Get the bot status! (Only for the bot owner)',
    },
}

module.exports.economy = {
    "addmoney": {
        name: 'addmoney',
        description: 'Add money to a user!',
    },
    "balance": {
        name: 'balance',
        description: 'Get the balance of a user!',
    },
    "daily": {
        name: 'daily',
        description: 'Claim a daily reward!',
    },
    "monthly": {
        name: 'monthly',
        description: 'Claim a monthly reward!',
    },
    "pay": {
        name: 'pay',
        description: 'Pay a user a certain amount!',
    },
    "removemoney": {
        name: 'removemoney',
        description: 'Remove money from a user!',
    },
    "rob": {
        name: 'rob',
        description: 'Rob a user!',
    },
    "weekly": {
        name: 'weekly',
        description: 'Claim a weekly reward!',
    },
    "work": {
        name: 'work',
        description: 'Claim a work reward!',
    },
}

module.exports.fun = {
    "caracteres": {
        name: 'caracteres',
        description: 'Transform a string into a DarkSasuke!',
    },
    "cats": {
        name: 'cats',
        description: 'Get a picture of cat!',
    },
    "dogs": {
        name: 'dogs',
        description: 'Get a picture of dog!',
    },
    "hack": {
        name: 'hack',
        description: 'Hack a user!',
    },
    "hug": {
        name: 'hug',
        description: 'Hug a user!',
    },
    "kiss": {
        name: 'kiss',
        description: 'Kiss a user!',
    },
    "morse": {
        name: 'morse',
        description: 'Transform a string into a Morse!',
    },
    "poll": {
        name: 'poll',
        description: 'Create a poll!',
    },
    "question": {
        name: 'question',
        description: 'Ask a question to the bot !',
    },
    "slap": {
        name: 'slap',
        description: 'Slap a user!',
    },
}

module.exports.giveaway = {
    "end": {
        name: 'end',
        description: 'Stop a giveaway!',
    },
    "start": {
        name: 'start',
        description: 'Start a giveaway!',
    },
    "reroll": {
        name: 'reroll',
        description: 'Reroll a giveaway winner(s)!',
    },
}

module.exports.guildconfig = {
    "blockpub": {
        name: 'blockpub',
        description: 'Allow/Unallow the user to send a advertisement into them messages!',
    },
    "guildconfig": {
        name: 'guildconfig',
        description: 'Get the guild configuration!',
    },
    "setchannel": {
        name: 'setchannel',
        description: 'Set the channel where the bot will send message when user leave/join guild!',
    },
    "setjoindm": {
        name: 'setjoindm',
        description: 'Set a join dm message when user join the guild!',
    },
    "setjoinmessage": {
        name: 'setjoinmessage',
        description: 'Set a join message when user join the guild!',
    },
    "setjoinroles": {
        name: 'setjoinroles',
        description: 'Set a join roles when user join the guild!',
    },
    "setleavemessage": {
        name: 'setleavemessage',
        description: 'Set a leave message when user leave the guild!',
    },
    "setup": {
        name: 'setup',
        description: 'Setup the logs channel about the bot!',
    },
}

module.exports.invitemanager = {
    "addinvites": {
        name: 'addinvites',
        description: 'Add invites to a user!',
    },
    "invites": {
        name: 'invites',
        description: 'Get the invites amount of a user!',
    },
    "leaderboard": {
        name: 'leaderboard',
        description: 'Show the guild invites\'s leaderboard!',
    },
    "removeinvites": {
        name: 'removeinvites',
        description: 'Remove invites from a user!',
    },
}

module.exports.membercount = {
    "membercount": {
        name: 'membercount',
        description: 'Set a member count channels!',
    },
}

module.exports.moderation = {
    "avatar": {
        name: 'avatar',
        description: 'Get the avatar of a user!',
    },
    "ban": {
        name: 'ban',
        description: 'Ban a user!',
    },
    clear: {
        name: 'clear',
        description: 'Clear x number of message in a channels !',
    },
    "kick": {
        name: 'kick',
        description: 'Kick a user!',
    },
    "lock": {
        name: 'lock',
        description: 'Remove ability to speak of all users in this text channel!',
    },
    "lockall": {
        name: 'lockall',
        description: 'Remove ability to speak of all users in all channels!',
    },
    "tempmute": {
        name: 'tempmute',
        description: 'Temporarily mute a user!',
    },
    "unban": {
        name: 'unban',
        description: 'Unban a user!',
    },
    "unlock": {
        name: 'unlock',
        description: 'Give ability to speak of all users in this text!',
    },
    "unmute": {
        name: 'unmute',
        description: 'Unmute a user!',
    },
}

module.exports.music = {
    "loop": {
        name: 'loop',
        description: 'Set loop mode of the guild!',
    },
    "nowplaying": {
        name: 'nowplaying',
        description: 'Get the current playing song!',
    },
    "pause": {
        name: 'pause',
        description: 'Pause the current playing song!',
    },
    "play": {
        name: 'play',
        description: 'Play a song!',
    },
    "queue": {
        name: 'queue',
        description: 'Get the queue!',
    },
    "resume": {
        name: 'resume',
        description: 'Resume the current playing song!',
    },
    "shuffle": {
        name: 'shuffle',
        description: 'Shuffle the queue!',
    },
    "skip": {
        name: 'skip',
        description: 'Skip the current playing song!',
    },
    "stop": {
        name: 'stop',
        description: 'Stop the current playing song!',
    },
}

module.exports.newfeatures = {
    "embed": {
        name: 'embed',
        description: 'Create a beautiful embed !',
    },
    "punishpub": {
        name: 'punishpub',
        description: 'Punish user when he send too much advertisement!',
    },
    "report": {
        name: 'report',
        description: 'Report a bug, error, spell error to the iHorizon\'s dev!',
    },
    "setlogschannel": {
        name: 'setlogschannel',
        description: 'Set a logs channels for Audits Logs!',
    },
    "support": {
        name: 'support',
        description: 'Give a roles when guild\'s member have something about your server on them bio!',
    },
}

module.exports.owner = {
    "blacklist": {
        name: 'blacklist',
        description: 'Add a user to the blacklist!',
    },
    "eval": {
        name: 'eval',
        description: 'Run Javascript program (only for developers)!',
    },
    "owner": {
        name: 'owner',
        description: 'add user to owner list (can\'t be used by normal member)!',
    },
    "unblacklist": {
        name: 'unblacklist',
        description: 'The user you want to unblacklist (Only Owner of ihorizon)!',
    },
    "unowner": {
        name: 'unowner',
        description: 'The member who wants to delete of the owner list (Only Owner of ihorizon)!',
    },
}

module.exports.profil = {
    "profil": {
        name: "profil",
        description: "See them iHorizon's profile!",
    },
    "setprofilage": {
        name: "setprofilage",
        description: "Set your age on the iHorizon Profil !",
    },
    "setprofildescription": {
        name: "setprofildescription",
        description: "Set your description on the iHorizon Profil!",
    },
}

module.exports.ranks = {
    "disablexp": {
        name: 'disablexp',
        description: "Disable the message when user earn new xp level message!",
    },
    "setxpchannel": {
        name: 'setxpchannel',
        description: "Set the channel where user earn new xp level message!",
    },
    "level": {
        name: 'level',
        description: "Get the user's xp level!",
    },
}

module.exports.rolereaction = {
    "rolereaction": {
        name: 'rolereaction',
        description: 'Set a roles when user react to a message with specific emoji',
    },
}

module.exports.ticket = {
    "add": {
        name: "add",
        description: "Add a member into your ticket!",
    },
    "close": {
        name: "close",
        description: "Close a ticket!",
    },
    'delete': {
        name: "delete",
        description: "Delete a iHorizon ticket!",
    },
    'disableticket': {
        name: "disableticket",
        description: "Disable ticket commands on a guild!",
    },
    'open': {
        name: "open",
        description: "re-open a closed ticket!",
    },
    'remove': {
        name: 'remove',
        description: "Remove a member from your ticket!",
    },
    'sethereticket': {
        name: "sethereticket",
        description: "Make a embed for allowing to user to create a ticket!",
    },
    'transcript': {
        name: "transcript",
        description: "Get the transcript of a ticket message!",
    },
}

module.exports.utils = {
    'guildinfo': {
        name: 'guildinfo',
        description: 'Get information about the server!',
    },
    "prevnames": {
        name: 'prevnames',
        description: 'Lookup an Discord User, and see this previous username!',
    },
    'renew': {
        name: 'renew',
        description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent!',
    },
    'setmentionrole': {
        name: 'setmentionrole',
        description: 'Set a mention roles when user mention someone!',
    },
    'snipe': {
        name: 'snipe',
        description: 'Get the last message deleted in this channel!',
    },
    'userinfo': {
        name: 'userinfo',
        description: 'Get information about a user!',
    },
};