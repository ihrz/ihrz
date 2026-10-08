# iHorizon Rust — inventaire des 28 catégories (6 sous-agents)

Généré depuis `src/Interaction/HybridCommands/*`. Chaque catégorie TS mappe
à `rust/src/commands/<cat>.rs`.

## Statut du port (2026-10-08) : 56 commandes, 133 tests, fmt clean

Porté (parent + subs, DB kv, tests) : moderation (+temprole/tempban),
security (+captcha), antispam, guildconfig (+setprefix), economy (money
loop + tunings), ranks (XP), profil (+money/level), pfps, music (13 subs,
history, audio pending), tts, h247, newfeatures (counter/nightmode/
gitlines), giveaway (+tirage/sweep/entries), ticket (+transcripts HTML),
backup (snapshots kv), schedule (CRUD + sweep), confession (+cooldown),
invites (leaderboard), membercount (templates), rolereactions,
starboard+skullboard, stats (+compare/gstats), sticky, tag, owner
(eval exclu), bot (say/setlang/invite/links), utils
(avatar/userinfo/serverinfo/snipe/addrole/delrole/help dynamique),
fun (dice/coinflip/number/question/morse/love/poll/hack/cat/dog/
hug/kiss/slap).
Events câblés : ready, guildCreate/Delete, join/leave (rolesaver,
welcome), message (XP/stats, counter, autoreact, sticky, suggestions,
antispam), messageDelete (snipe), reactions (roles + starboard),
userUpdate (prevnames), boutons (confession, giveaway).
Infra : schedulers (schedule/giveaway/temprole-tempban), cooldowns,
pagination, préfixe dynamique, blacklist globale, release consume-once,
embed builder model, transcripts builder, notifier dedup.
Pendant (infra externe) : audio Lavalink, html2png, SMTP, APIs
Twitch/YouTube/animaux, MySQL, HorizonGateway.

| Cat | Fichiers | Commandes (extraits) | DB | Déps externes | Cplx |
|---|---|---|---|---|---|
| fun | 34 | 67, bubbles, captions, cat, dice, dog, love, poll, tweet, youtube + !config | GUILD.FUN.states | html2png, axios animal APIs, fetch, gif/canvas | S/M/L mixte |
| utils | 69 | avatar, vc, userinfo, snipe, dm, massmove, serverinfo, emojis, embed + util/* (40+) | UTILS.wlRoles/picOnly/LEASH/VOICE_*, UNBANALL | jszip, HorizonGateway, image64 | S/M/L |
| bot | 18 | say, ping, help, botinfo, status, invite, links, setlang, custom/* | GUILD.LANG, BOT.botName/Avatar | os/uptime, axios avatar | S (help M) |
| stats | 7 | ustats, gstats, top-messages, top-voice, compare, channel-stats | STATS, STATS.USER.* | html2png x5 | M/L |
| moderation | 24 | ban, kick, clear, lock, tempmute, tempban, temprole, warn*, rolepanel | USER.*.WARNS | aucune (discord.js seul) | M (rolepanel L) |
| security | 5 | channel, config, role-to-give, role-to-remove | SECURITY.* | aucune | S |
| antispam | 4 | manage (780l), bypass-roles, ignore-channels | GUILD.ANTISPAM* | aucune | L (manage), M |
| guildconfig | 4 | autoreact, commandlimit, setlogs (11 types), support | AUTOREACT, COMMAND_LIMITS, SERVER_LOGS, SUPPORT | aucune | M |
| economy | 23 | balance, pay, rob, work, daily/weekly/monthly, shop, boost-set, role.* | ECONOMY.*, USER.*.ECONOMY.* | html2png podium | L |
| ranks | 10 | show, leaderboard, roles, config, channel, message | RANKS.*, GUILD.RANKS.* | html2png ranksCard/podium | M |
| profil | 7 | show, set-age/desc/gender/pronoun/birthday (wizard 3 modals) | profilTable + ECONOMY/RANKS | aucune | S |
| pfps | 3 | channel, config | PFPS.* | aucune | S |
| music | 15 | play, skip, queue, loop, lyrics, nowplaying, history, volume... | MUSIC_HISTORY | lavalink-client, searchLyrics, html2png | L |
| tts | 5 | join, leave, info, lang | GUILD.TTS (ttsManager) | lavalink ftts, Flowery voices | M |
| h247 | 4 | join, leave, info | GUILD.H247 (h247Manager) | lavalink persistant | M |
| newfeatures | 6 | nightmode (owner), git lines, counter channel/config | NIGHT_MODE, git_lines, COUNTER | aucune | L (nightmode), S |
| giveaway | 8 | create, end, reroll, list-entries, get-data, get-all | giveawaysTable + INVITES/STATS | aucune | M |
| ticket | 16 | open/close/delete/add-member/transcript/panel/config... | TICKET.*, TICKET_PANEL.*, EMBED.* | discord-html-transcripts | L |
| backup | 7+lib | create, list, load, delete, manage | BACKUPS.*, GUILD.BACKUP | aucune (fork maison) | L |
| schedule | 2 | /schedule (menu create/delete/delete-all/list) | scheduleTable | aucune | S |
| confession | 6 | channel, config, thread, cooldown | CONFESSION.*, GUILD.CONFESSION.* | aucune | S |
| invitesmanager | 7 | addinvites, invites, leaderboard, removeinvites, reset | USER.*.INVITES | image64, pagination | M |
| membercount | 2 | /membercount on/off + template compteurs | GUILD.MCOUNT.* | aucune | S |
| rolereactions | 4 | rolereaction, rolebutton, roleselect (2 modals + preview) | REACTION_ROLES.*, ROLE_SELECT.* | emojiChecker, modals | L |
| starboard | 11 | starboard+skullboard x config/channel/threshold/create-thread | STARBOARD, SKULLBOARD | aucune | S |
| sticky | 8 | text, embed, disable, show, list, refresh | STICKY.*, EMBED.* | stickyMessageManager | M |
| tag | 10 | create, use, edit, delete, list, info, wlroles-* | GUILD.TAGS.* + EMBED.* | tagHelper, pagination | M |
| owner | 8 | owner, unowner, eval, blacklist, unblacklist, blinfo, bledit | blacklistTable + BLACKLIST.* | broadcastEval sharded | L |

Ordre de port suggéré : S d'abord (security, pfps, confession, membercount,
starboard, schedule, profil, bot), puis M (invites, sticky, tag, tts, h247,
moderation, guildconfig, ranks), puis L (antispam-manage, economy, music,
ticket, backup, rolereactions-select, stats-png, utils-embed/zip, owner-eval).
