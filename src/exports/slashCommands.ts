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

// Generated from src/Interaction/SlashCommands by src/core/modules/exportsManifest.ts.
// Do not edit: `bun run dev` or `bun run gen:exports` rewrites it.

import * as m0 from "../Interaction/SlashCommands/authrestore/!delete.ts";
import * as m1 from "../Interaction/SlashCommands/authrestore/!force-join.ts";
import * as m2 from "../Interaction/SlashCommands/authrestore/!get.ts";
import * as m3 from "../Interaction/SlashCommands/authrestore/!roles.ts";
import * as m4 from "../Interaction/SlashCommands/authrestore/!set.ts";
import * as m5 from "../Interaction/SlashCommands/authrestore/authrestore.ts";
import * as m6 from "../Interaction/SlashCommands/authrestore/init.json" with { type: "json" };
import * as m7 from "../Interaction/SlashCommands/blogger/!add.ts";
import * as m8 from "../Interaction/SlashCommands/blogger/!list.ts";
import * as m9 from "../Interaction/SlashCommands/blogger/!remove.ts";
import * as m10 from "../Interaction/SlashCommands/blogger/!status.ts";
import * as m11 from "../Interaction/SlashCommands/blogger/blogger.ts";
import * as m12 from "../Interaction/SlashCommands/blogger/init.json" with { type: "json" };
import * as m13 from "../Interaction/SlashCommands/guildconfig/!bot.ts";
import * as m14 from "../Interaction/SlashCommands/guildconfig/!prefix.ts";
import * as m15 from "../Interaction/SlashCommands/guildconfig/!restore.ts";
import * as m16 from "../Interaction/SlashCommands/guildconfig/!save.ts";
import * as m17 from "../Interaction/SlashCommands/guildconfig/!setup.ts";
import * as m18 from "../Interaction/SlashCommands/guildconfig/!show.ts";
import * as m19 from "../Interaction/SlashCommands/guildconfig/!too-new-account.ts";
import * as m20 from "../Interaction/SlashCommands/guildconfig/!welcomer.ts";
import * as m21 from "../Interaction/SlashCommands/guildconfig/guildconfig.ts";
import * as m22 from "../Interaction/SlashCommands/guildconfig/init.json" with { type: "json" };
import * as m23 from "../Interaction/SlashCommands/guildconfig/join-ghostping/!add.ts";
import * as m24 from "../Interaction/SlashCommands/guildconfig/join-ghostping/!remove.ts";
import * as m25 from "../Interaction/SlashCommands/guildconfig/join-ghostping/join-ghostping.ts";
import * as m26 from "../Interaction/SlashCommands/guildconfig/perm/!command.ts";
import * as m27 from "../Interaction/SlashCommands/guildconfig/perm/!create-roles.ts";
import * as m28 from "../Interaction/SlashCommands/guildconfig/perm/!edit-roles.ts";
import * as m29 from "../Interaction/SlashCommands/guildconfig/perm/!list.ts";
import * as m30 from "../Interaction/SlashCommands/guildconfig/perm/!set-user.ts";
import * as m31 from "../Interaction/SlashCommands/guildconfig/perm/perm.ts";
import * as m32 from "../Interaction/SlashCommands/guildconfig/welcomerPanel.ts";
import * as m33 from "../Interaction/SlashCommands/honeypot/!config.ts";
import * as m34 from "../Interaction/SlashCommands/honeypot/honeypot.ts";
import * as m35 from "../Interaction/SlashCommands/honeypot/init.json" with { type: "json" };
import * as m36 from "../Interaction/SlashCommands/lastfm/!config.ts";
import * as m37 from "../Interaction/SlashCommands/lastfm/!login.ts";
import * as m38 from "../Interaction/SlashCommands/lastfm/init.json" with { type: "json" };
import * as m39 from "../Interaction/SlashCommands/lastfm/lastfm.ts";
import * as m40 from "../Interaction/SlashCommands/newfeatures/init.json" with { type: "json" };
import * as m41 from "../Interaction/SlashCommands/newfeatures/punishpub.ts";
import * as m42 from "../Interaction/SlashCommands/newfeatures/report.ts";
import * as m43 from "../Interaction/SlashCommands/newfeatures/rolesaver.ts";
import * as m44 from "../Interaction/SlashCommands/notifier/!add.ts";
import * as m45 from "../Interaction/SlashCommands/notifier/!channel.ts";
import * as m46 from "../Interaction/SlashCommands/notifier/!list.ts";
import * as m47 from "../Interaction/SlashCommands/notifier/!message.ts";
import * as m48 from "../Interaction/SlashCommands/notifier/!remove.ts";
import * as m49 from "../Interaction/SlashCommands/notifier/init.json" with { type: "json" };
import * as m50 from "../Interaction/SlashCommands/notifier/notifier.ts";
import * as m51 from "../Interaction/SlashCommands/suggestion/init.json" with { type: "json" };
import * as m52 from "../Interaction/SlashCommands/suggestion/setsuggest/!channel.ts";
import * as m53 from "../Interaction/SlashCommands/suggestion/setsuggest/!config.ts";
import * as m54 from "../Interaction/SlashCommands/suggestion/setsuggest/setsuggest.ts";
import * as m55 from "../Interaction/SlashCommands/suggestion/suggest/!accept.ts";
import * as m56 from "../Interaction/SlashCommands/suggestion/suggest/!delete.ts";
import * as m57 from "../Interaction/SlashCommands/suggestion/suggest/!deny.ts";
import * as m58 from "../Interaction/SlashCommands/suggestion/suggest/!reply.ts";
import * as m59 from "../Interaction/SlashCommands/suggestion/suggest/suggest.ts";
import * as m60 from "../Interaction/SlashCommands/voicedashboard/!tempvoice.ts";
import * as m61 from "../Interaction/SlashCommands/voicedashboard/init.json" with { type: "json" };
import * as m62 from "../Interaction/SlashCommands/voicedashboard/voicedashboard.ts";

const files: Record<string, any> = {
	"authrestore/!delete.ts": m0,
	"authrestore/!force-join.ts": m1,
	"authrestore/!get.ts": m2,
	"authrestore/!roles.ts": m3,
	"authrestore/!set.ts": m4,
	"authrestore/authrestore.ts": m5,
	"authrestore/init.json": m6,
	"blogger/!add.ts": m7,
	"blogger/!list.ts": m8,
	"blogger/!remove.ts": m9,
	"blogger/!status.ts": m10,
	"blogger/blogger.ts": m11,
	"blogger/init.json": m12,
	"guildconfig/!bot.ts": m13,
	"guildconfig/!prefix.ts": m14,
	"guildconfig/!restore.ts": m15,
	"guildconfig/!save.ts": m16,
	"guildconfig/!setup.ts": m17,
	"guildconfig/!show.ts": m18,
	"guildconfig/!too-new-account.ts": m19,
	"guildconfig/!welcomer.ts": m20,
	"guildconfig/guildconfig.ts": m21,
	"guildconfig/init.json": m22,
	"guildconfig/join-ghostping/!add.ts": m23,
	"guildconfig/join-ghostping/!remove.ts": m24,
	"guildconfig/join-ghostping/join-ghostping.ts": m25,
	"guildconfig/perm/!command.ts": m26,
	"guildconfig/perm/!create-roles.ts": m27,
	"guildconfig/perm/!edit-roles.ts": m28,
	"guildconfig/perm/!list.ts": m29,
	"guildconfig/perm/!set-user.ts": m30,
	"guildconfig/perm/perm.ts": m31,
	"guildconfig/welcomerPanel.ts": m32,
	"honeypot/!config.ts": m33,
	"honeypot/honeypot.ts": m34,
	"honeypot/init.json": m35,
	"lastfm/!config.ts": m36,
	"lastfm/!login.ts": m37,
	"lastfm/init.json": m38,
	"lastfm/lastfm.ts": m39,
	"newfeatures/init.json": m40,
	"newfeatures/punishpub.ts": m41,
	"newfeatures/report.ts": m42,
	"newfeatures/rolesaver.ts": m43,
	"notifier/!add.ts": m44,
	"notifier/!channel.ts": m45,
	"notifier/!list.ts": m46,
	"notifier/!message.ts": m47,
	"notifier/!remove.ts": m48,
	"notifier/init.json": m49,
	"notifier/notifier.ts": m50,
	"suggestion/init.json": m51,
	"suggestion/setsuggest/!channel.ts": m52,
	"suggestion/setsuggest/!config.ts": m53,
	"suggestion/setsuggest/setsuggest.ts": m54,
	"suggestion/suggest/!accept.ts": m55,
	"suggestion/suggest/!delete.ts": m56,
	"suggestion/suggest/!deny.ts": m57,
	"suggestion/suggest/!reply.ts": m58,
	"suggestion/suggest/suggest.ts": m59,
	"voicedashboard/!tempvoice.ts": m60,
	"voicedashboard/init.json": m61,
	"voicedashboard/voicedashboard.ts": m62
};

export default files;
