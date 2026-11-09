/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

// Generated from src/Interaction/HybridCommands by src/core/modules/exportsManifest.ts.
// Do not edit: `bun run dev` or `bun run gen:exports` rewrites it.

import * as m0 from "../Interaction/HybridCommands/antispam/!bypass-roles.ts";
import * as m1 from "../Interaction/HybridCommands/antispam/!ignore-channels.ts";
import * as m2 from "../Interaction/HybridCommands/antispam/!manage.ts";
import * as m3 from "../Interaction/HybridCommands/antispam/antispam.ts";
import * as m4 from "../Interaction/HybridCommands/antispam/init.json" with { type: "json" };
import * as m5 from "../Interaction/HybridCommands/backup/!create.ts";
import * as m6 from "../Interaction/HybridCommands/backup/!delete.ts";
import * as m7 from "../Interaction/HybridCommands/backup/!list.ts";
import * as m8 from "../Interaction/HybridCommands/backup/!load.ts";
import * as m9 from "../Interaction/HybridCommands/backup/!manage.ts";
import * as m10 from "../Interaction/HybridCommands/backup/!schedule.ts";
import * as m11 from "../Interaction/HybridCommands/backup/backup.ts";
import * as m12 from "../Interaction/HybridCommands/backup/init.json" with { type: "json" };
import * as m13 from "../Interaction/HybridCommands/bot/andru.ts";
import * as m14 from "../Interaction/HybridCommands/bot/botinfo.ts";
import * as m15 from "../Interaction/HybridCommands/bot/custom/!avatar.ts";
import * as m16 from "../Interaction/HybridCommands/bot/custom/!banner.ts";
import * as m17 from "../Interaction/HybridCommands/bot/custom/!bio.ts";
import * as m18 from "../Interaction/HybridCommands/bot/custom/!name.ts";
import * as m19 from "../Interaction/HybridCommands/bot/custom/custom.ts";
import * as m20 from "../Interaction/HybridCommands/bot/ether.ts";
import * as m21 from "../Interaction/HybridCommands/bot/help.ts";
import * as m22 from "../Interaction/HybridCommands/bot/init.json" with { type: "json" };
import * as m23 from "../Interaction/HybridCommands/bot/invite.ts";
import * as m24 from "../Interaction/HybridCommands/bot/iris.ts";
import * as m25 from "../Interaction/HybridCommands/bot/kisakay.ts";
import * as m26 from "../Interaction/HybridCommands/bot/link.ts";
import * as m27 from "../Interaction/HybridCommands/bot/noaimie.ts";
import * as m28 from "../Interaction/HybridCommands/bot/ping.ts";
import * as m29 from "../Interaction/HybridCommands/bot/say.ts";
import * as m30 from "../Interaction/HybridCommands/bot/setserverlang.ts";
import * as m31 from "../Interaction/HybridCommands/bot/status.ts";
import * as m32 from "../Interaction/HybridCommands/confession/!ban.ts";
import * as m33 from "../Interaction/HybridCommands/confession/!channel.ts";
import * as m34 from "../Interaction/HybridCommands/confession/!config.ts";
import * as m35 from "../Interaction/HybridCommands/confession/!cooldown.ts";
import * as m36 from "../Interaction/HybridCommands/confession/!delete.ts";
import * as m37 from "../Interaction/HybridCommands/confession/!thread.ts";
import * as m38 from "../Interaction/HybridCommands/confession/!unban.ts";
import * as m39 from "../Interaction/HybridCommands/confession/confession.ts";
import * as m40 from "../Interaction/HybridCommands/confession/init.json" with { type: "json" };
import * as m41 from "../Interaction/HybridCommands/economy/!add.ts";
import * as m42 from "../Interaction/HybridCommands/economy/!balance-add.ts";
import * as m43 from "../Interaction/HybridCommands/economy/!balance-remove.ts";
import * as m44 from "../Interaction/HybridCommands/economy/!balance.ts";
import * as m45 from "../Interaction/HybridCommands/economy/!boost-set.ts";
import * as m46 from "../Interaction/HybridCommands/economy/!config.ts";
import * as m47 from "../Interaction/HybridCommands/economy/!daily.ts";
import * as m48 from "../Interaction/HybridCommands/economy/!delete.ts";
import * as m49 from "../Interaction/HybridCommands/economy/!deposit.ts";
import * as m50 from "../Interaction/HybridCommands/economy/!greset.ts";
import * as m51 from "../Interaction/HybridCommands/economy/!leaderboard.ts";
import * as m52 from "../Interaction/HybridCommands/economy/!list.ts";
import * as m53 from "../Interaction/HybridCommands/economy/!monthly.ts";
import * as m54 from "../Interaction/HybridCommands/economy/!pay.ts";
import * as m55 from "../Interaction/HybridCommands/economy/!rob.ts";
import * as m56 from "../Interaction/HybridCommands/economy/!set-cooldown.ts";
import * as m57 from "../Interaction/HybridCommands/economy/!set-money.ts";
import * as m58 from "../Interaction/HybridCommands/economy/!shop.ts";
import * as m59 from "../Interaction/HybridCommands/economy/!ureset.ts";
import * as m60 from "../Interaction/HybridCommands/economy/!weekly.ts";
import * as m61 from "../Interaction/HybridCommands/economy/!withdraw.ts";
import * as m62 from "../Interaction/HybridCommands/economy/!work.ts";
import * as m63 from "../Interaction/HybridCommands/economy/economy.ts";
import * as m64 from "../Interaction/HybridCommands/economy/init.json" with { type: "json" };
import * as m65 from "../Interaction/HybridCommands/fun/!67.ts";
import * as m66 from "../Interaction/HybridCommands/fun/!bubbles.ts";
import * as m67 from "../Interaction/HybridCommands/fun/!captions.ts";
import * as m68 from "../Interaction/HybridCommands/fun/!caracteres.ts";
import * as m69 from "../Interaction/HybridCommands/fun/!cat.ts";
import * as m70 from "../Interaction/HybridCommands/fun/!catsay.ts";
import * as m71 from "../Interaction/HybridCommands/fun/!config.ts";
import * as m72 from "../Interaction/HybridCommands/fun/!dice.ts";
import * as m73 from "../Interaction/HybridCommands/fun/!dog.ts";
import * as m74 from "../Interaction/HybridCommands/fun/!dolphin.ts";
import * as m75 from "../Interaction/HybridCommands/fun/!duck.ts";
import * as m76 from "../Interaction/HybridCommands/fun/!fox.ts";
import * as m77 from "../Interaction/HybridCommands/fun/!frog.ts";
import * as m78 from "../Interaction/HybridCommands/fun/!gay.ts";
import * as m79 from "../Interaction/HybridCommands/fun/!hack.ts";
import * as m80 from "../Interaction/HybridCommands/fun/!heads-tails.ts";
import * as m81 from "../Interaction/HybridCommands/fun/!hug.ts";
import * as m82 from "../Interaction/HybridCommands/fun/!kiss.ts";
import * as m83 from "../Interaction/HybridCommands/fun/!love.ts";
import * as m84 from "../Interaction/HybridCommands/fun/!morse.ts";
import * as m85 from "../Interaction/HybridCommands/fun/!number.ts";
import * as m86 from "../Interaction/HybridCommands/fun/!panda.ts";
import * as m87 from "../Interaction/HybridCommands/fun/!poll.ts";
import * as m88 from "../Interaction/HybridCommands/fun/!question.ts";
import * as m89 from "../Interaction/HybridCommands/fun/!rate.ts";
import * as m90 from "../Interaction/HybridCommands/fun/!slap.ts";
import * as m91 from "../Interaction/HybridCommands/fun/!squirrel.ts";
import * as m92 from "../Interaction/HybridCommands/fun/!stench.ts";
import * as m93 from "../Interaction/HybridCommands/fun/!togif.ts";
import * as m94 from "../Interaction/HybridCommands/fun/!trans.ts";
import * as m95 from "../Interaction/HybridCommands/fun/!transgender.ts";
import * as m96 from "../Interaction/HybridCommands/fun/!tweet.ts";
import * as m97 from "../Interaction/HybridCommands/fun/!youtube.ts";
import * as m98 from "../Interaction/HybridCommands/fun/fun.ts";
import * as m99 from "../Interaction/HybridCommands/fun/init.json" with { type: "json" };
import * as m100 from "../Interaction/HybridCommands/giveaway/!create.ts";
import * as m101 from "../Interaction/HybridCommands/giveaway/!end.ts";
import * as m102 from "../Interaction/HybridCommands/giveaway/!get-all.ts";
import * as m103 from "../Interaction/HybridCommands/giveaway/!get-data.ts";
import * as m104 from "../Interaction/HybridCommands/giveaway/!go.ts";
import * as m105 from "../Interaction/HybridCommands/giveaway/!list-entries.ts";
import * as m106 from "../Interaction/HybridCommands/giveaway/!reroll.ts";
import * as m107 from "../Interaction/HybridCommands/giveaway/gw.ts";
import * as m108 from "../Interaction/HybridCommands/giveaway/init.json" with { type: "json" };
import * as m109 from "../Interaction/HybridCommands/guildconfig/automod/automod.ts";
import * as m110 from "../Interaction/HybridCommands/guildconfig/automod/automodPanel.ts";
import * as m111 from "../Interaction/HybridCommands/guildconfig/autoreact.ts";
import * as m112 from "../Interaction/HybridCommands/guildconfig/commandlimit.ts";
import * as m113 from "../Interaction/HybridCommands/guildconfig/setlogschannel.ts";
import * as m114 from "../Interaction/HybridCommands/guildconfig/support.ts";
import * as m115 from "../Interaction/HybridCommands/h247/!info.ts";
import * as m116 from "../Interaction/HybridCommands/h247/!join.ts";
import * as m117 from "../Interaction/HybridCommands/h247/!leave.ts";
import * as m118 from "../Interaction/HybridCommands/h247/h247.ts";
import * as m119 from "../Interaction/HybridCommands/h247/init.json" with { type: "json" };
import * as m120 from "../Interaction/HybridCommands/invitesmanager/!addinvites.ts";
import * as m121 from "../Interaction/HybridCommands/invitesmanager/!invites.ts";
import * as m122 from "../Interaction/HybridCommands/invitesmanager/!leaderboard.ts";
import * as m123 from "../Interaction/HybridCommands/invitesmanager/!removeinvites.ts";
import * as m124 from "../Interaction/HybridCommands/invitesmanager/!reset.ts";
import * as m125 from "../Interaction/HybridCommands/invitesmanager/init.json" with { type: "json" };
import * as m126 from "../Interaction/HybridCommands/invitesmanager/invites.ts";
import * as m127 from "../Interaction/HybridCommands/membercount/init.json" with { type: "json" };
import * as m128 from "../Interaction/HybridCommands/membercount/membercount.ts";
import * as m129 from "../Interaction/HybridCommands/moderation/!ban.ts";
import * as m130 from "../Interaction/HybridCommands/moderation/!baninfo.ts";
import * as m131 from "../Interaction/HybridCommands/moderation/!banlist.ts";
import * as m132 from "../Interaction/HybridCommands/moderation/!clear-all-warns.ts";
import * as m133 from "../Interaction/HybridCommands/moderation/!clear.ts";
import * as m134 from "../Interaction/HybridCommands/moderation/!clearwarn.ts";
import * as m135 from "../Interaction/HybridCommands/moderation/!kick.ts";
import * as m136 from "../Interaction/HybridCommands/moderation/!lock-all.ts";
import * as m137 from "../Interaction/HybridCommands/moderation/!lock.ts";
import * as m138 from "../Interaction/HybridCommands/moderation/!mutelist.ts";
import * as m139 from "../Interaction/HybridCommands/moderation/!rolepanel.ts";
import * as m140 from "../Interaction/HybridCommands/moderation/!tempban.ts";
import * as m141 from "../Interaction/HybridCommands/moderation/!tempmute.ts";
import * as m142 from "../Interaction/HybridCommands/moderation/!temprole.ts";
import * as m143 from "../Interaction/HybridCommands/moderation/!unban.ts";
import * as m144 from "../Interaction/HybridCommands/moderation/!unlock-all.ts";
import * as m145 from "../Interaction/HybridCommands/moderation/!unlock.ts";
import * as m146 from "../Interaction/HybridCommands/moderation/!unmute.ts";
import * as m147 from "../Interaction/HybridCommands/moderation/!unmuteall.ts";
import * as m148 from "../Interaction/HybridCommands/moderation/!unwarn.ts";
import * as m149 from "../Interaction/HybridCommands/moderation/!warn.ts";
import * as m150 from "../Interaction/HybridCommands/moderation/!warnlist.ts";
import * as m151 from "../Interaction/HybridCommands/moderation/init.json" with { type: "json" };
import * as m152 from "../Interaction/HybridCommands/moderation/mod.ts";
import * as m153 from "../Interaction/HybridCommands/music/!apo.ts";
import * as m154 from "../Interaction/HybridCommands/music/!clear-queue.ts";
import * as m155 from "../Interaction/HybridCommands/music/!history.ts";
import * as m156 from "../Interaction/HybridCommands/music/!loop.ts";
import * as m157 from "../Interaction/HybridCommands/music/!lyrics.ts";
import * as m158 from "../Interaction/HybridCommands/music/!nowplaying.ts";
import * as m159 from "../Interaction/HybridCommands/music/!pause.ts";
import * as m160 from "../Interaction/HybridCommands/music/!play.ts";
import * as m161 from "../Interaction/HybridCommands/music/!queue.ts";
import * as m162 from "../Interaction/HybridCommands/music/!resume.ts";
import * as m163 from "../Interaction/HybridCommands/music/!shuffle.ts";
import * as m164 from "../Interaction/HybridCommands/music/!skip.ts";
import * as m165 from "../Interaction/HybridCommands/music/!stop.ts";
import * as m166 from "../Interaction/HybridCommands/music/!trackinfo.ts";
import * as m167 from "../Interaction/HybridCommands/music/!volume.ts";
import * as m168 from "../Interaction/HybridCommands/music/init.json" with { type: "json" };
import * as m169 from "../Interaction/HybridCommands/music/music.ts";
import * as m170 from "../Interaction/HybridCommands/newfeatures/!lines.ts";
import * as m171 from "../Interaction/HybridCommands/newfeatures/counter/!channel.ts";
import * as m172 from "../Interaction/HybridCommands/newfeatures/counter/!config.ts";
import * as m173 from "../Interaction/HybridCommands/newfeatures/counter/counter.ts";
import * as m174 from "../Interaction/HybridCommands/newfeatures/gitlines.ts";
import * as m175 from "../Interaction/HybridCommands/newfeatures/nightmode.ts";
import * as m176 from "../Interaction/HybridCommands/owner/blacklist.ts";
import * as m177 from "../Interaction/HybridCommands/owner/bledit.ts";
import * as m178 from "../Interaction/HybridCommands/owner/blinfo.ts";
import * as m179 from "../Interaction/HybridCommands/owner/eval.ts";
import * as m180 from "../Interaction/HybridCommands/owner/init.json" with { type: "json" };
import * as m181 from "../Interaction/HybridCommands/owner/owner.ts";
import * as m182 from "../Interaction/HybridCommands/owner/unblacklist.ts";
import * as m183 from "../Interaction/HybridCommands/owner/unowner.ts";
import * as m184 from "../Interaction/HybridCommands/pfps/!channel.ts";
import * as m185 from "../Interaction/HybridCommands/pfps/!config.ts";
import * as m186 from "../Interaction/HybridCommands/pfps/init.json" with { type: "json" };
import * as m187 from "../Interaction/HybridCommands/pfps/pfps.ts";
import * as m188 from "../Interaction/HybridCommands/profil/!set-age.ts";
import * as m189 from "../Interaction/HybridCommands/profil/!set-birthday.ts";
import * as m190 from "../Interaction/HybridCommands/profil/!set-description.ts";
import * as m191 from "../Interaction/HybridCommands/profil/!set-gender.ts";
import * as m192 from "../Interaction/HybridCommands/profil/!set-pronoun.ts";
import * as m193 from "../Interaction/HybridCommands/profil/!show.ts";
import * as m194 from "../Interaction/HybridCommands/profil/init.json" with { type: "json" };
import * as m195 from "../Interaction/HybridCommands/profil/profil.ts";
import * as m196 from "../Interaction/HybridCommands/protection/allowlist/!add.ts";
import * as m197 from "../Interaction/HybridCommands/protection/allowlist/!remove.ts";
import * as m198 from "../Interaction/HybridCommands/protection/allowlist/!show.ts";
import * as m199 from "../Interaction/HybridCommands/protection/allowlist/allowlist.ts";
import * as m200 from "../Interaction/HybridCommands/protection/init.json" with { type: "json" };
import * as m201 from "../Interaction/HybridCommands/protection/protect.ts";
import * as m202 from "../Interaction/HybridCommands/protection/protectPanel.ts";
import * as m203 from "../Interaction/HybridCommands/ranks/!channel.ts";
import * as m204 from "../Interaction/HybridCommands/ranks/!config.ts";
import * as m205 from "../Interaction/HybridCommands/ranks/!greset.ts";
import * as m206 from "../Interaction/HybridCommands/ranks/!ignore-channels.ts";
import * as m207 from "../Interaction/HybridCommands/ranks/!leaderboard.ts";
import * as m208 from "../Interaction/HybridCommands/ranks/!message.ts";
import * as m209 from "../Interaction/HybridCommands/ranks/!roles.ts";
import * as m210 from "../Interaction/HybridCommands/ranks/!show.ts";
import * as m211 from "../Interaction/HybridCommands/ranks/!ureset.ts";
import * as m212 from "../Interaction/HybridCommands/ranks/init.json" with { type: "json" };
import * as m213 from "../Interaction/HybridCommands/ranks/ranks.ts";
import * as m214 from "../Interaction/HybridCommands/rolereactions/init.json" with { type: "json" };
import * as m215 from "../Interaction/HybridCommands/rolereactions/rolebutton.ts";
import * as m216 from "../Interaction/HybridCommands/rolereactions/rolereaction.ts";
import * as m217 from "../Interaction/HybridCommands/rolereactions/roleselect.ts";
import * as m218 from "../Interaction/HybridCommands/schedule/init.json" with { type: "json" };
import * as m219 from "../Interaction/HybridCommands/schedule/schedule.ts";
import * as m220 from "../Interaction/HybridCommands/security/!channel.ts";
import * as m221 from "../Interaction/HybridCommands/security/!config.ts";
import * as m222 from "../Interaction/HybridCommands/security/!role-to-give.ts";
import * as m223 from "../Interaction/HybridCommands/security/!role-to-remove.ts";
import * as m224 from "../Interaction/HybridCommands/security/init.json" with { type: "json" };
import * as m225 from "../Interaction/HybridCommands/security/security.ts";
import * as m226 from "../Interaction/HybridCommands/starboard/!channel.ts";
import * as m227 from "../Interaction/HybridCommands/starboard/!config.ts";
import * as m228 from "../Interaction/HybridCommands/starboard/!create-thread.ts";
import * as m229 from "../Interaction/HybridCommands/starboard/!threshold.ts";
import * as m230 from "../Interaction/HybridCommands/starboard/init.json" with { type: "json" };
import * as m231 from "../Interaction/HybridCommands/starboard/skullboard/!channel.ts";
import * as m232 from "../Interaction/HybridCommands/starboard/skullboard/!config.ts";
import * as m233 from "../Interaction/HybridCommands/starboard/skullboard/!create-thread.ts";
import * as m234 from "../Interaction/HybridCommands/starboard/skullboard/!threshold.ts";
import * as m235 from "../Interaction/HybridCommands/starboard/skullboard/skullboard.ts";
import * as m236 from "../Interaction/HybridCommands/starboard/starboard.ts";
import * as m237 from "../Interaction/HybridCommands/stats/!channel-stats.ts";
import * as m238 from "../Interaction/HybridCommands/stats/!compare.ts";
import * as m239 from "../Interaction/HybridCommands/stats/!gstats.ts";
import * as m240 from "../Interaction/HybridCommands/stats/!top-messages.ts";
import * as m241 from "../Interaction/HybridCommands/stats/!top-voice.ts";
import * as m242 from "../Interaction/HybridCommands/stats/!ustats.ts";
import * as m243 from "../Interaction/HybridCommands/stats/init.json" with { type: "json" };
import * as m244 from "../Interaction/HybridCommands/stats/stats.ts";
import * as m245 from "../Interaction/HybridCommands/sticky/!disable.ts";
import * as m246 from "../Interaction/HybridCommands/sticky/!embed.ts";
import * as m247 from "../Interaction/HybridCommands/sticky/!list.ts";
import * as m248 from "../Interaction/HybridCommands/sticky/!refresh.ts";
import * as m249 from "../Interaction/HybridCommands/sticky/!show.ts";
import * as m250 from "../Interaction/HybridCommands/sticky/!text.ts";
import * as m251 from "../Interaction/HybridCommands/sticky/init.json" with { type: "json" };
import * as m252 from "../Interaction/HybridCommands/sticky/sticky.ts";
import * as m253 from "../Interaction/HybridCommands/tag/!create.ts";
import * as m254 from "../Interaction/HybridCommands/tag/!delete.ts";
import * as m255 from "../Interaction/HybridCommands/tag/!edit.ts";
import * as m256 from "../Interaction/HybridCommands/tag/!info.ts";
import * as m257 from "../Interaction/HybridCommands/tag/!list.ts";
import * as m258 from "../Interaction/HybridCommands/tag/!use.ts";
import * as m259 from "../Interaction/HybridCommands/tag/!wlroles-create.ts";
import * as m260 from "../Interaction/HybridCommands/tag/!wlroles-use.ts";
import * as m261 from "../Interaction/HybridCommands/tag/init.json" with { type: "json" };
import * as m262 from "../Interaction/HybridCommands/tag/tag.ts";
import * as m263 from "../Interaction/HybridCommands/ticket/!add-member.ts";
import * as m264 from "../Interaction/HybridCommands/ticket/!close.ts";
import * as m265 from "../Interaction/HybridCommands/ticket/!config.ts";
import * as m266 from "../Interaction/HybridCommands/ticket/!delete.ts";
import * as m267 from "../Interaction/HybridCommands/ticket/!log-channel.ts";
import * as m268 from "../Interaction/HybridCommands/ticket/!open.ts";
import * as m269 from "../Interaction/HybridCommands/ticket/!panel.ts";
import * as m270 from "../Interaction/HybridCommands/ticket/!remind.ts";
import * as m271 from "../Interaction/HybridCommands/ticket/!remove-member.ts";
import * as m272 from "../Interaction/HybridCommands/ticket/!rename.ts";
import * as m273 from "../Interaction/HybridCommands/ticket/!set-category.ts";
import * as m274 from "../Interaction/HybridCommands/ticket/!transcript.ts";
import * as m275 from "../Interaction/HybridCommands/ticket/!unlink.ts";
import * as m276 from "../Interaction/HybridCommands/ticket/init.json" with { type: "json" };
import * as m277 from "../Interaction/HybridCommands/ticket/ticket.ts";
import * as m278 from "../Interaction/HybridCommands/tts/!info.ts";
import * as m279 from "../Interaction/HybridCommands/tts/!join.ts";
import * as m280 from "../Interaction/HybridCommands/tts/!lang.ts";
import * as m281 from "../Interaction/HybridCommands/tts/!leave.ts";
import * as m282 from "../Interaction/HybridCommands/tts/init.json" with { type: "json" };
import * as m283 from "../Interaction/HybridCommands/tts/tts.ts";
import * as m284 from "../Interaction/HybridCommands/utils/!addrole.ts";
import * as m285 from "../Interaction/HybridCommands/utils/!admin-users.ts";
import * as m286 from "../Interaction/HybridCommands/utils/!allbots.ts";
import * as m287 from "../Interaction/HybridCommands/utils/!avatar.ts";
import * as m288 from "../Interaction/HybridCommands/utils/!delrole.ts";
import * as m289 from "../Interaction/HybridCommands/utils/!derank.ts";
import * as m290 from "../Interaction/HybridCommands/utils/!dm.ts";
import * as m291 from "../Interaction/HybridCommands/utils/!embed.ts";
import * as m292 from "../Interaction/HybridCommands/utils/!emojis.ts";
import * as m293 from "../Interaction/HybridCommands/utils/!leash.ts";
import * as m294 from "../Interaction/HybridCommands/utils/!massiverole.ts";
import * as m295 from "../Interaction/HybridCommands/utils/!massmove.ts";
import * as m296 from "../Interaction/HybridCommands/utils/!media-only.ts";
import * as m297 from "../Interaction/HybridCommands/utils/!nickrole.ts";
import * as m298 from "../Interaction/HybridCommands/utils/!prevnames.ts";
import * as m299 from "../Interaction/HybridCommands/utils/!renew.ts";
import * as m300 from "../Interaction/HybridCommands/utils/!serverinfo.ts";
import * as m301 from "../Interaction/HybridCommands/utils/!setmentionrole.ts";
import * as m302 from "../Interaction/HybridCommands/utils/!snipe.ts";
import * as m303 from "../Interaction/HybridCommands/utils/!unleash.ts";
import * as m304 from "../Interaction/HybridCommands/utils/!userinfo.ts";
import * as m305 from "../Interaction/HybridCommands/utils/!vanity-generator.ts";
import * as m306 from "../Interaction/HybridCommands/utils/!vc.ts";
import * as m307 from "../Interaction/HybridCommands/utils/!wlroles.ts";
import * as m308 from "../Interaction/HybridCommands/utils/!zip-emojis.ts";
import * as m309 from "../Interaction/HybridCommands/utils/banner/!server.ts";
import * as m310 from "../Interaction/HybridCommands/utils/banner/!user.ts";
import * as m311 from "../Interaction/HybridCommands/utils/banner/banner.ts";
import * as m312 from "../Interaction/HybridCommands/utils/chanel/!hide.ts";
import * as m313 from "../Interaction/HybridCommands/utils/chanel/!hideall.ts";
import * as m314 from "../Interaction/HybridCommands/utils/chanel/!unhide.ts";
import * as m315 from "../Interaction/HybridCommands/utils/chanel/!unhideall.ts";
import * as m316 from "../Interaction/HybridCommands/utils/chanel/channel.ts";
import * as m317 from "../Interaction/HybridCommands/utils/init.json" with { type: "json" };
import * as m318 from "../Interaction/HybridCommands/utils/unbanall/!all.ts";
import * as m319 from "../Interaction/HybridCommands/utils/unbanall/!undo.ts";
import * as m320 from "../Interaction/HybridCommands/utils/unbanall/unbanall.ts";
import * as m321 from "../Interaction/HybridCommands/utils/util/!addrolereact.ts";
import * as m322 from "../Interaction/HybridCommands/utils/util/!admin-roles.ts";
import * as m323 from "../Interaction/HybridCommands/utils/util/!allwebhooks.ts";
import * as m324 from "../Interaction/HybridCommands/utils/util/!autorenew.ts";
import * as m325 from "../Interaction/HybridCommands/utils/util/!bringall.ts";
import * as m326 from "../Interaction/HybridCommands/utils/util/!cooldown.ts";
import * as m327 from "../Interaction/HybridCommands/utils/util/!derogation.ts";
import * as m328 from "../Interaction/HybridCommands/utils/util/!freeze.ts";
import * as m329 from "../Interaction/HybridCommands/utils/util/!inviteinfo.ts";
import * as m330 from "../Interaction/HybridCommands/utils/util/!move.ts";
import * as m331 from "../Interaction/HybridCommands/utils/util/!nick-kicker.ts";
import * as m332 from "../Interaction/HybridCommands/utils/util/!role-members.ts";
import * as m333 from "../Interaction/HybridCommands/utils/util/!rolelimit.ts";
import * as m334 from "../Interaction/HybridCommands/utils/util/!serverpic.ts";
import * as m335 from "../Interaction/HybridCommands/utils/util/!sync.ts";
import * as m336 from "../Interaction/HybridCommands/utils/util/!talk.ts";
import * as m337 from "../Interaction/HybridCommands/utils/util/!unfreeze.ts";
import * as m338 from "../Interaction/HybridCommands/utils/util/!untalk.ts";
import * as m339 from "../Interaction/HybridCommands/utils/util/!unwlvc.ts";
import * as m340 from "../Interaction/HybridCommands/utils/util/!unzip-emojis.ts";
import * as m341 from "../Interaction/HybridCommands/utils/util/!vkick.ts";
import * as m342 from "../Interaction/HybridCommands/utils/util/!wakeup.ts";
import * as m343 from "../Interaction/HybridCommands/utils/util/!where.ts";
import * as m344 from "../Interaction/HybridCommands/utils/util/!wlvc.ts";
import * as m345 from "../Interaction/HybridCommands/utils/util/!zip-stickers.ts";
import * as m346 from "../Interaction/HybridCommands/utils/util/util.ts";
import * as m347 from "../Interaction/HybridCommands/utils/utils.ts";
import * as m348 from "../Interaction/HybridCommands/utils/utilss/!leashlist.ts";
import * as m349 from "../Interaction/HybridCommands/utils/utilss/!lockname.ts";
import * as m350 from "../Interaction/HybridCommands/utils/utilss/!locknamelist.ts";
import * as m351 from "../Interaction/HybridCommands/utils/utilss/!renewvc.ts";
import * as m352 from "../Interaction/HybridCommands/utils/utilss/!unlockname.ts";
import * as m353 from "../Interaction/HybridCommands/utils/utilss/utilss.ts";

const files: Record<string, any> = {
	"antispam/!bypass-roles.ts": m0,
	"antispam/!ignore-channels.ts": m1,
	"antispam/!manage.ts": m2,
	"antispam/antispam.ts": m3,
	"antispam/init.json": m4,
	"backup/!create.ts": m5,
	"backup/!delete.ts": m6,
	"backup/!list.ts": m7,
	"backup/!load.ts": m8,
	"backup/!manage.ts": m9,
	"backup/!schedule.ts": m10,
	"backup/backup.ts": m11,
	"backup/init.json": m12,
	"bot/andru.ts": m13,
	"bot/botinfo.ts": m14,
	"bot/custom/!avatar.ts": m15,
	"bot/custom/!banner.ts": m16,
	"bot/custom/!bio.ts": m17,
	"bot/custom/!name.ts": m18,
	"bot/custom/custom.ts": m19,
	"bot/ether.ts": m20,
	"bot/help.ts": m21,
	"bot/init.json": m22,
	"bot/invite.ts": m23,
	"bot/iris.ts": m24,
	"bot/kisakay.ts": m25,
	"bot/link.ts": m26,
	"bot/noaimie.ts": m27,
	"bot/ping.ts": m28,
	"bot/say.ts": m29,
	"bot/setserverlang.ts": m30,
	"bot/status.ts": m31,
	"confession/!ban.ts": m32,
	"confession/!channel.ts": m33,
	"confession/!config.ts": m34,
	"confession/!cooldown.ts": m35,
	"confession/!delete.ts": m36,
	"confession/!thread.ts": m37,
	"confession/!unban.ts": m38,
	"confession/confession.ts": m39,
	"confession/init.json": m40,
	"economy/!add.ts": m41,
	"economy/!balance-add.ts": m42,
	"economy/!balance-remove.ts": m43,
	"economy/!balance.ts": m44,
	"economy/!boost-set.ts": m45,
	"economy/!config.ts": m46,
	"economy/!daily.ts": m47,
	"economy/!delete.ts": m48,
	"economy/!deposit.ts": m49,
	"economy/!greset.ts": m50,
	"economy/!leaderboard.ts": m51,
	"economy/!list.ts": m52,
	"economy/!monthly.ts": m53,
	"economy/!pay.ts": m54,
	"economy/!rob.ts": m55,
	"economy/!set-cooldown.ts": m56,
	"economy/!set-money.ts": m57,
	"economy/!shop.ts": m58,
	"economy/!ureset.ts": m59,
	"economy/!weekly.ts": m60,
	"economy/!withdraw.ts": m61,
	"economy/!work.ts": m62,
	"economy/economy.ts": m63,
	"economy/init.json": m64,
	"fun/!67.ts": m65,
	"fun/!bubbles.ts": m66,
	"fun/!captions.ts": m67,
	"fun/!caracteres.ts": m68,
	"fun/!cat.ts": m69,
	"fun/!catsay.ts": m70,
	"fun/!config.ts": m71,
	"fun/!dice.ts": m72,
	"fun/!dog.ts": m73,
	"fun/!dolphin.ts": m74,
	"fun/!duck.ts": m75,
	"fun/!fox.ts": m76,
	"fun/!frog.ts": m77,
	"fun/!gay.ts": m78,
	"fun/!hack.ts": m79,
	"fun/!heads-tails.ts": m80,
	"fun/!hug.ts": m81,
	"fun/!kiss.ts": m82,
	"fun/!love.ts": m83,
	"fun/!morse.ts": m84,
	"fun/!number.ts": m85,
	"fun/!panda.ts": m86,
	"fun/!poll.ts": m87,
	"fun/!question.ts": m88,
	"fun/!rate.ts": m89,
	"fun/!slap.ts": m90,
	"fun/!squirrel.ts": m91,
	"fun/!stench.ts": m92,
	"fun/!togif.ts": m93,
	"fun/!trans.ts": m94,
	"fun/!transgender.ts": m95,
	"fun/!tweet.ts": m96,
	"fun/!youtube.ts": m97,
	"fun/fun.ts": m98,
	"fun/init.json": m99,
	"giveaway/!create.ts": m100,
	"giveaway/!end.ts": m101,
	"giveaway/!get-all.ts": m102,
	"giveaway/!get-data.ts": m103,
	"giveaway/!go.ts": m104,
	"giveaway/!list-entries.ts": m105,
	"giveaway/!reroll.ts": m106,
	"giveaway/gw.ts": m107,
	"giveaway/init.json": m108,
	"guildconfig/automod/automod.ts": m109,
	"guildconfig/automod/automodPanel.ts": m110,
	"guildconfig/autoreact.ts": m111,
	"guildconfig/commandlimit.ts": m112,
	"guildconfig/setlogschannel.ts": m113,
	"guildconfig/support.ts": m114,
	"h247/!info.ts": m115,
	"h247/!join.ts": m116,
	"h247/!leave.ts": m117,
	"h247/h247.ts": m118,
	"h247/init.json": m119,
	"invitesmanager/!addinvites.ts": m120,
	"invitesmanager/!invites.ts": m121,
	"invitesmanager/!leaderboard.ts": m122,
	"invitesmanager/!removeinvites.ts": m123,
	"invitesmanager/!reset.ts": m124,
	"invitesmanager/init.json": m125,
	"invitesmanager/invites.ts": m126,
	"membercount/init.json": m127,
	"membercount/membercount.ts": m128,
	"moderation/!ban.ts": m129,
	"moderation/!baninfo.ts": m130,
	"moderation/!banlist.ts": m131,
	"moderation/!clear-all-warns.ts": m132,
	"moderation/!clear.ts": m133,
	"moderation/!clearwarn.ts": m134,
	"moderation/!kick.ts": m135,
	"moderation/!lock-all.ts": m136,
	"moderation/!lock.ts": m137,
	"moderation/!mutelist.ts": m138,
	"moderation/!rolepanel.ts": m139,
	"moderation/!tempban.ts": m140,
	"moderation/!tempmute.ts": m141,
	"moderation/!temprole.ts": m142,
	"moderation/!unban.ts": m143,
	"moderation/!unlock-all.ts": m144,
	"moderation/!unlock.ts": m145,
	"moderation/!unmute.ts": m146,
	"moderation/!unmuteall.ts": m147,
	"moderation/!unwarn.ts": m148,
	"moderation/!warn.ts": m149,
	"moderation/!warnlist.ts": m150,
	"moderation/init.json": m151,
	"moderation/mod.ts": m152,
	"music/!apo.ts": m153,
	"music/!clear-queue.ts": m154,
	"music/!history.ts": m155,
	"music/!loop.ts": m156,
	"music/!lyrics.ts": m157,
	"music/!nowplaying.ts": m158,
	"music/!pause.ts": m159,
	"music/!play.ts": m160,
	"music/!queue.ts": m161,
	"music/!resume.ts": m162,
	"music/!shuffle.ts": m163,
	"music/!skip.ts": m164,
	"music/!stop.ts": m165,
	"music/!trackinfo.ts": m166,
	"music/!volume.ts": m167,
	"music/init.json": m168,
	"music/music.ts": m169,
	"newfeatures/!lines.ts": m170,
	"newfeatures/counter/!channel.ts": m171,
	"newfeatures/counter/!config.ts": m172,
	"newfeatures/counter/counter.ts": m173,
	"newfeatures/gitlines.ts": m174,
	"newfeatures/nightmode.ts": m175,
	"owner/blacklist.ts": m176,
	"owner/bledit.ts": m177,
	"owner/blinfo.ts": m178,
	"owner/eval.ts": m179,
	"owner/init.json": m180,
	"owner/owner.ts": m181,
	"owner/unblacklist.ts": m182,
	"owner/unowner.ts": m183,
	"pfps/!channel.ts": m184,
	"pfps/!config.ts": m185,
	"pfps/init.json": m186,
	"pfps/pfps.ts": m187,
	"profil/!set-age.ts": m188,
	"profil/!set-birthday.ts": m189,
	"profil/!set-description.ts": m190,
	"profil/!set-gender.ts": m191,
	"profil/!set-pronoun.ts": m192,
	"profil/!show.ts": m193,
	"profil/init.json": m194,
	"profil/profil.ts": m195,
	"protection/allowlist/!add.ts": m196,
	"protection/allowlist/!remove.ts": m197,
	"protection/allowlist/!show.ts": m198,
	"protection/allowlist/allowlist.ts": m199,
	"protection/init.json": m200,
	"protection/protect.ts": m201,
	"protection/protectPanel.ts": m202,
	"ranks/!channel.ts": m203,
	"ranks/!config.ts": m204,
	"ranks/!greset.ts": m205,
	"ranks/!ignore-channels.ts": m206,
	"ranks/!leaderboard.ts": m207,
	"ranks/!message.ts": m208,
	"ranks/!roles.ts": m209,
	"ranks/!show.ts": m210,
	"ranks/!ureset.ts": m211,
	"ranks/init.json": m212,
	"ranks/ranks.ts": m213,
	"rolereactions/init.json": m214,
	"rolereactions/rolebutton.ts": m215,
	"rolereactions/rolereaction.ts": m216,
	"rolereactions/roleselect.ts": m217,
	"schedule/init.json": m218,
	"schedule/schedule.ts": m219,
	"security/!channel.ts": m220,
	"security/!config.ts": m221,
	"security/!role-to-give.ts": m222,
	"security/!role-to-remove.ts": m223,
	"security/init.json": m224,
	"security/security.ts": m225,
	"starboard/!channel.ts": m226,
	"starboard/!config.ts": m227,
	"starboard/!create-thread.ts": m228,
	"starboard/!threshold.ts": m229,
	"starboard/init.json": m230,
	"starboard/skullboard/!channel.ts": m231,
	"starboard/skullboard/!config.ts": m232,
	"starboard/skullboard/!create-thread.ts": m233,
	"starboard/skullboard/!threshold.ts": m234,
	"starboard/skullboard/skullboard.ts": m235,
	"starboard/starboard.ts": m236,
	"stats/!channel-stats.ts": m237,
	"stats/!compare.ts": m238,
	"stats/!gstats.ts": m239,
	"stats/!top-messages.ts": m240,
	"stats/!top-voice.ts": m241,
	"stats/!ustats.ts": m242,
	"stats/init.json": m243,
	"stats/stats.ts": m244,
	"sticky/!disable.ts": m245,
	"sticky/!embed.ts": m246,
	"sticky/!list.ts": m247,
	"sticky/!refresh.ts": m248,
	"sticky/!show.ts": m249,
	"sticky/!text.ts": m250,
	"sticky/init.json": m251,
	"sticky/sticky.ts": m252,
	"tag/!create.ts": m253,
	"tag/!delete.ts": m254,
	"tag/!edit.ts": m255,
	"tag/!info.ts": m256,
	"tag/!list.ts": m257,
	"tag/!use.ts": m258,
	"tag/!wlroles-create.ts": m259,
	"tag/!wlroles-use.ts": m260,
	"tag/init.json": m261,
	"tag/tag.ts": m262,
	"ticket/!add-member.ts": m263,
	"ticket/!close.ts": m264,
	"ticket/!config.ts": m265,
	"ticket/!delete.ts": m266,
	"ticket/!log-channel.ts": m267,
	"ticket/!open.ts": m268,
	"ticket/!panel.ts": m269,
	"ticket/!remind.ts": m270,
	"ticket/!remove-member.ts": m271,
	"ticket/!rename.ts": m272,
	"ticket/!set-category.ts": m273,
	"ticket/!transcript.ts": m274,
	"ticket/!unlink.ts": m275,
	"ticket/init.json": m276,
	"ticket/ticket.ts": m277,
	"tts/!info.ts": m278,
	"tts/!join.ts": m279,
	"tts/!lang.ts": m280,
	"tts/!leave.ts": m281,
	"tts/init.json": m282,
	"tts/tts.ts": m283,
	"utils/!addrole.ts": m284,
	"utils/!admin-users.ts": m285,
	"utils/!allbots.ts": m286,
	"utils/!avatar.ts": m287,
	"utils/!delrole.ts": m288,
	"utils/!derank.ts": m289,
	"utils/!dm.ts": m290,
	"utils/!embed.ts": m291,
	"utils/!emojis.ts": m292,
	"utils/!leash.ts": m293,
	"utils/!massiverole.ts": m294,
	"utils/!massmove.ts": m295,
	"utils/!media-only.ts": m296,
	"utils/!nickrole.ts": m297,
	"utils/!prevnames.ts": m298,
	"utils/!renew.ts": m299,
	"utils/!serverinfo.ts": m300,
	"utils/!setmentionrole.ts": m301,
	"utils/!snipe.ts": m302,
	"utils/!unleash.ts": m303,
	"utils/!userinfo.ts": m304,
	"utils/!vanity-generator.ts": m305,
	"utils/!vc.ts": m306,
	"utils/!wlroles.ts": m307,
	"utils/!zip-emojis.ts": m308,
	"utils/banner/!server.ts": m309,
	"utils/banner/!user.ts": m310,
	"utils/banner/banner.ts": m311,
	"utils/chanel/!hide.ts": m312,
	"utils/chanel/!hideall.ts": m313,
	"utils/chanel/!unhide.ts": m314,
	"utils/chanel/!unhideall.ts": m315,
	"utils/chanel/channel.ts": m316,
	"utils/init.json": m317,
	"utils/unbanall/!all.ts": m318,
	"utils/unbanall/!undo.ts": m319,
	"utils/unbanall/unbanall.ts": m320,
	"utils/util/!addrolereact.ts": m321,
	"utils/util/!admin-roles.ts": m322,
	"utils/util/!allwebhooks.ts": m323,
	"utils/util/!autorenew.ts": m324,
	"utils/util/!bringall.ts": m325,
	"utils/util/!cooldown.ts": m326,
	"utils/util/!derogation.ts": m327,
	"utils/util/!freeze.ts": m328,
	"utils/util/!inviteinfo.ts": m329,
	"utils/util/!move.ts": m330,
	"utils/util/!nick-kicker.ts": m331,
	"utils/util/!role-members.ts": m332,
	"utils/util/!rolelimit.ts": m333,
	"utils/util/!serverpic.ts": m334,
	"utils/util/!sync.ts": m335,
	"utils/util/!talk.ts": m336,
	"utils/util/!unfreeze.ts": m337,
	"utils/util/!untalk.ts": m338,
	"utils/util/!unwlvc.ts": m339,
	"utils/util/!unzip-emojis.ts": m340,
	"utils/util/!vkick.ts": m341,
	"utils/util/!wakeup.ts": m342,
	"utils/util/!where.ts": m343,
	"utils/util/!wlvc.ts": m344,
	"utils/util/!zip-stickers.ts": m345,
	"utils/util/util.ts": m346,
	"utils/utils.ts": m347,
	"utils/utilss/!leashlist.ts": m348,
	"utils/utilss/!lockname.ts": m349,
	"utils/utilss/!locknamelist.ts": m350,
	"utils/utilss/!renewvc.ts": m351,
	"utils/utilss/!unlockname.ts": m352,
	"utils/utilss/utilss.ts": m353
};

export default files;
