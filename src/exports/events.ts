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

// Generated from src/Events by src/core/modules/exportsManifest.ts.
// Do not edit: `bun run dev` or `bun run gen:exports` rewrites it.

import * as m0 from "../Events/antispam/onNewMessage.ts";
import * as m1 from "../Events/client/blacklistFetcher.ts";
import * as m2 from "../Events/client/deleteDatabaseDataOnGuildLeave.ts";
import * as m3 from "../Events/client/guildCreate.ts";
import * as m4 from "../Events/client/onRateLimit.ts";
import * as m5 from "../Events/client/ready.ts";
import * as m6 from "../Events/client/removeGuildLog.ts";
import * as m7 from "../Events/counter/onNewMessage.ts";
import * as m8 from "../Events/github-lines/onNewMessage.ts";
import * as m9 from "../Events/guildconfig/autoreact.ts";
import * as m10 from "../Events/guildconfig/blockBot.ts";
import * as m11 from "../Events/guildconfig/blockSpam.ts";
import * as m12 from "../Events/guildconfig/ghostPingModule.ts";
import * as m13 from "../Events/guildconfig/joinDm.ts";
import * as m14 from "../Events/guildconfig/joinMessage.ts";
import * as m15 from "../Events/guildconfig/joinRole.ts";
import * as m16 from "../Events/guildconfig/leaveMessage.ts";
import * as m17 from "../Events/guildconfig/reactToMessage.ts";
import * as m18 from "../Events/guildconfig/tooNewAccount.ts";
import * as m19 from "../Events/h247/channelDelete.ts";
import * as m20 from "../Events/h247/voiceState.ts";
import * as m21 from "../Events/honeypot/honeypot.ts";
import * as m22 from "../Events/interaction/buttonHandler.ts";
import * as m23 from "../Events/interaction/contextCommandHandler.ts";
import * as m24 from "../Events/interaction/messageCommandHandler.ts";
import * as m25 from "../Events/interaction/selectMenuHandler.ts";
import * as m26 from "../Events/interaction/slashCommandHandler.ts";
import * as m27 from "../Events/invitemanager/onGuildLeave.ts";
import * as m28 from "../Events/invitemanager/onInviteCreate.ts";
import * as m29 from "../Events/invitemanager/onInviteDelete.ts";
import * as m30 from "../Events/lavalink-client/lastFMScrobbler.ts";
import * as m31 from "../Events/lavalink-client/raw.ts";
import * as m32 from "../Events/lavalink-client/stopMusicOnEmptyVoiceChannel.ts";
import * as m33 from "../Events/linked-channel/onNewMessage.ts";
import * as m34 from "../Events/logs/addBanLogs.ts";
import * as m35 from "../Events/logs/boostLogs.ts";
import * as m36 from "../Events/logs/channelUpdateLogs.ts";
import * as m37 from "../Events/logs/ihorizon_logs.ts";
import * as m38 from "../Events/logs/kickLogs.ts";
import * as m39 from "../Events/logs/messageDeleteLogs.ts";
import * as m40 from "../Events/logs/messageUpdateLogs.ts";
import * as m41 from "../Events/logs/removeBanLogs.ts";
import * as m42 from "../Events/logs/rolesLogs.ts";
import * as m43 from "../Events/logs/slashCommandLogger.ts";
import * as m44 from "../Events/logs/voiceLogs.ts";
import * as m45 from "../Events/protection/auditLogs.ts";
import * as m46 from "../Events/protection/createAllowlistOnMessage.ts";
import * as m47 from "../Events/protection/protectAuditLogEntry.ts";
import * as m48 from "../Events/protection/protectSnapshotChannelDelete.ts";
import * as m49 from "../Events/protection/protectSnapshotOrphan.ts";
import * as m50 from "../Events/protection/protectSnapshotRoleDelete.ts";
import * as m51 from "../Events/ranks/onNewMessage.ts";
import * as m52 from "../Events/reactionrole/onReactAdd.ts";
import * as m53 from "../Events/reactionrole/onReactRemove.ts";
import * as m54 from "../Events/rolesaver/onMemberJoin.ts";
import * as m55 from "../Events/rolesaver/onMemberLeave.ts";
import * as m56 from "../Events/security/onMemberJoin.ts";
import * as m57 from "../Events/starboard/onDeletedReact.ts";
import * as m58 from "../Events/starboard/onNewReact.ts";
import * as m59 from "../Events/starboard/skullboard/onDeletedReact.ts";
import * as m60 from "../Events/starboard/skullboard/onNewReact.ts";
import * as m61 from "../Events/stats/onNewMessage.ts";
import * as m62 from "../Events/stats/onVoiceUpdate.ts";
import * as m63 from "../Events/sticky/onNewMessage.ts";
import * as m64 from "../Events/suggestion/onNewMessage.ts";
import * as m65 from "../Events/ticket/deleteTicketOnLeave.ts";
import * as m66 from "../Events/ticket/deleteTicketPanel.ts";
import * as m67 from "../Events/ticket/deleteTicketPanelOnMessageDelete.ts";
import * as m68 from "../Events/tts/messageCreate.ts";
import * as m69 from "../Events/tts/voiceState.ts";
import * as m70 from "../Events/utils/antiExe.ts";
import * as m71 from "../Events/utils/autoFeur.ts";
import * as m72 from "../Events/utils/guildOwnerSafetySetWhenMessage.ts";
import * as m73 from "../Events/utils/leashModule.ts";
import * as m74 from "../Events/utils/locknameModule.ts";
import * as m75 from "../Events/utils/nickKicker.ts";
import * as m76 from "../Events/utils/picOnlyModule.ts";
import * as m77 from "../Events/utils/prevnamesModule.ts";
import * as m78 from "../Events/utils/prevnamesModuleGuild.ts";
import * as m79 from "../Events/utils/rankRoleModule.ts";
import * as m80 from "../Events/utils/rankRoleModule_2.ts";
import * as m81 from "../Events/utils/roleLimit.ts";
import * as m82 from "../Events/utils/snipeModule.ts";
import * as m83 from "../Events/utils/supportModule.ts";
import * as m84 from "../Events/utils/voiceTalkFreeze.ts";
import * as m85 from "../Events/voicedashboard/voiceState.ts";

const files: Record<string, any> = {
	"antispam/onNewMessage.ts": m0,
	"client/blacklistFetcher.ts": m1,
	"client/deleteDatabaseDataOnGuildLeave.ts": m2,
	"client/guildCreate.ts": m3,
	"client/onRateLimit.ts": m4,
	"client/ready.ts": m5,
	"client/removeGuildLog.ts": m6,
	"counter/onNewMessage.ts": m7,
	"github-lines/onNewMessage.ts": m8,
	"guildconfig/autoreact.ts": m9,
	"guildconfig/blockBot.ts": m10,
	"guildconfig/blockSpam.ts": m11,
	"guildconfig/ghostPingModule.ts": m12,
	"guildconfig/joinDm.ts": m13,
	"guildconfig/joinMessage.ts": m14,
	"guildconfig/joinRole.ts": m15,
	"guildconfig/leaveMessage.ts": m16,
	"guildconfig/reactToMessage.ts": m17,
	"guildconfig/tooNewAccount.ts": m18,
	"h247/channelDelete.ts": m19,
	"h247/voiceState.ts": m20,
	"honeypot/honeypot.ts": m21,
	"interaction/buttonHandler.ts": m22,
	"interaction/contextCommandHandler.ts": m23,
	"interaction/messageCommandHandler.ts": m24,
	"interaction/selectMenuHandler.ts": m25,
	"interaction/slashCommandHandler.ts": m26,
	"invitemanager/onGuildLeave.ts": m27,
	"invitemanager/onInviteCreate.ts": m28,
	"invitemanager/onInviteDelete.ts": m29,
	"lavalink-client/lastFMScrobbler.ts": m30,
	"lavalink-client/raw.ts": m31,
	"lavalink-client/stopMusicOnEmptyVoiceChannel.ts": m32,
	"linked-channel/onNewMessage.ts": m33,
	"logs/addBanLogs.ts": m34,
	"logs/boostLogs.ts": m35,
	"logs/channelUpdateLogs.ts": m36,
	"logs/ihorizon_logs.ts": m37,
	"logs/kickLogs.ts": m38,
	"logs/messageDeleteLogs.ts": m39,
	"logs/messageUpdateLogs.ts": m40,
	"logs/removeBanLogs.ts": m41,
	"logs/rolesLogs.ts": m42,
	"logs/slashCommandLogger.ts": m43,
	"logs/voiceLogs.ts": m44,
	"protection/auditLogs.ts": m45,
	"protection/createAllowlistOnMessage.ts": m46,
	"protection/protectAuditLogEntry.ts": m47,
	"protection/protectSnapshotChannelDelete.ts": m48,
	"protection/protectSnapshotOrphan.ts": m49,
	"protection/protectSnapshotRoleDelete.ts": m50,
	"ranks/onNewMessage.ts": m51,
	"reactionrole/onReactAdd.ts": m52,
	"reactionrole/onReactRemove.ts": m53,
	"rolesaver/onMemberJoin.ts": m54,
	"rolesaver/onMemberLeave.ts": m55,
	"security/onMemberJoin.ts": m56,
	"starboard/onDeletedReact.ts": m57,
	"starboard/onNewReact.ts": m58,
	"starboard/skullboard/onDeletedReact.ts": m59,
	"starboard/skullboard/onNewReact.ts": m60,
	"stats/onNewMessage.ts": m61,
	"stats/onVoiceUpdate.ts": m62,
	"sticky/onNewMessage.ts": m63,
	"suggestion/onNewMessage.ts": m64,
	"ticket/deleteTicketOnLeave.ts": m65,
	"ticket/deleteTicketPanel.ts": m66,
	"ticket/deleteTicketPanelOnMessageDelete.ts": m67,
	"tts/messageCreate.ts": m68,
	"tts/voiceState.ts": m69,
	"utils/antiExe.ts": m70,
	"utils/autoFeur.ts": m71,
	"utils/guildOwnerSafetySetWhenMessage.ts": m72,
	"utils/leashModule.ts": m73,
	"utils/locknameModule.ts": m74,
	"utils/nickKicker.ts": m75,
	"utils/picOnlyModule.ts": m76,
	"utils/prevnamesModule.ts": m77,
	"utils/prevnamesModuleGuild.ts": m78,
	"utils/rankRoleModule.ts": m79,
	"utils/rankRoleModule_2.ts": m80,
	"utils/roleLimit.ts": m81,
	"utils/snipeModule.ts": m82,
	"utils/supportModule.ts": m83,
	"utils/voiceTalkFreeze.ts": m84,
	"voicedashboard/voiceState.ts": m85
};

export default files;
