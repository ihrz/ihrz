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

// Generated from src/core/functions by src/core/modules/exportsManifest.ts.
// Do not edit: `bun run dev` or `bun run gen:exports` rewrites it.

import * as m0 from "../core/functions/apiUrlParser.ts";
import * as m1 from "../core/functions/assetsCalc.ts";
import * as m2 from "../core/functions/authRestoreHelper.ts";
import * as m3 from "../core/functions/awaitingResponse.ts";
import * as m4 from "../core/functions/axios.ts";
import * as m5 from "../core/functions/bannerGenerator.ts";
import * as m6 from "../core/functions/bannerURL.ts";
import * as m7 from "../core/functions/batchProcessor.ts";
import * as m8 from "../core/functions/colors.ts";
import * as m9 from "../core/functions/customProfileHelper.ts";
import * as m10 from "../core/functions/database_latency.ts";
import * as m11 from "../core/functions/date_and_time.ts";
import * as m12 from "../core/functions/displayBotName.ts";
import * as m13 from "../core/functions/economyHelper.ts";
import * as m14 from "../core/functions/economyLogs.ts";
import * as m15 from "../core/functions/embedHelper.ts";
import * as m16 from "../core/functions/emojiChecker.ts";
import * as m17 from "../core/functions/encryptDecryptMethod.ts";
import * as m18 from "../core/functions/generateProgressBar.ts";
import * as m19 from "../core/functions/getIp.ts";
import * as m20 from "../core/functions/getLanguageData.ts";
import * as m21 from "../core/functions/getLanguageDataByCode.ts";
import * as m22 from "../core/functions/getMessageURL.ts";
import * as m23 from "../core/functions/hasIhorizonLogs.ts";
import * as m24 from "../core/functions/helper.ts";
import * as m25 from "../core/functions/iHorizonAssets.ts";
import * as m26 from "../core/functions/ihorizon_logs.ts";
import * as m27 from "../core/functions/image64.ts";
import * as m28 from "../core/functions/image_dominant_color.ts";
import * as m29 from "../core/functions/intentEnabler.ts";
import * as m30 from "../core/functions/isAllowedLinks.ts";
import * as m31 from "../core/functions/kdenliveManipulator.ts";
import * as m32 from "../core/functions/leashModuleHelper.ts";
import * as m33 from "../core/functions/logChannel.ts";
import * as m34 from "../core/functions/maskLink.ts";
import * as m35 from "../core/functions/mediaManipulation.ts";
import * as m36 from "../core/functions/messageDiff.ts";
import * as m37 from "../core/functions/method.ts";
import * as m38 from "../core/functions/modalHelper.ts";
import * as m39 from "../core/functions/moduleToggle.ts";
import * as m40 from "../core/functions/ms.ts";
import * as m41 from "../core/functions/musicPlay.ts";
import * as m42 from "../core/functions/music_proximity.ts";
import * as m43 from "../core/functions/numberBeautifuer.ts";
import * as m44 from "../core/functions/os_utils.ts";
import * as m45 from "../core/functions/ownerHelper.ts";
import * as m46 from "../core/functions/permissonsCalculator.ts";
import * as m47 from "../core/functions/prefix.ts";
import * as m48 from "../core/functions/random.ts";
import * as m49 from "../core/functions/randomExpression.ts";
import * as m50 from "../core/functions/retrieveMyself.ts";
import * as m51 from "../core/functions/roleSelectMenu.ts";
import * as m52 from "../core/functions/sanitizeInteractionOptionValue.ts";
import * as m53 from "../core/functions/sanitizer.ts";
import * as m54 from "../core/functions/searchLyrics.ts";
import * as m55 from "../core/functions/shard_helper.ts";
import * as m56 from "../core/functions/svg2png.ts";
import * as m57 from "../core/functions/svgKit.ts";
import * as m58 from "../core/functions/tagHelper.ts";
import * as m59 from "../core/functions/tempVoiceCandidate.ts";
import * as m60 from "../core/functions/typeGuards.ts";
import * as m61 from "../core/functions/userStatsUtils.ts";
import * as m62 from "../core/functions/utcSelect.ts";
import * as m63 from "../core/functions/validImageType.ts";
import * as m64 from "../core/functions/wait.ts";
import * as m65 from "../core/functions/welcomerEmbed.ts";
import * as m66 from "../core/functions/welcomerMessage.ts";

const files: Record<string, unknown> = {
	"apiUrlParser.ts": m0,
	"assetsCalc.ts": m1,
	"authRestoreHelper.ts": m2,
	"awaitingResponse.ts": m3,
	"axios.ts": m4,
	"bannerGenerator.ts": m5,
	"bannerURL.ts": m6,
	"batchProcessor.ts": m7,
	"colors.ts": m8,
	"customProfileHelper.ts": m9,
	"database_latency.ts": m10,
	"date_and_time.ts": m11,
	"displayBotName.ts": m12,
	"economyHelper.ts": m13,
	"economyLogs.ts": m14,
	"embedHelper.ts": m15,
	"emojiChecker.ts": m16,
	"encryptDecryptMethod.ts": m17,
	"generateProgressBar.ts": m18,
	"getIp.ts": m19,
	"getLanguageData.ts": m20,
	"getLanguageDataByCode.ts": m21,
	"getMessageURL.ts": m22,
	"hasIhorizonLogs.ts": m23,
	"helper.ts": m24,
	"iHorizonAssets.ts": m25,
	"ihorizon_logs.ts": m26,
	"image64.ts": m27,
	"image_dominant_color.ts": m28,
	"intentEnabler.ts": m29,
	"isAllowedLinks.ts": m30,
	"kdenliveManipulator.ts": m31,
	"leashModuleHelper.ts": m32,
	"logChannel.ts": m33,
	"maskLink.ts": m34,
	"mediaManipulation.ts": m35,
	"messageDiff.ts": m36,
	"method.ts": m37,
	"modalHelper.ts": m38,
	"moduleToggle.ts": m39,
	"ms.ts": m40,
	"musicPlay.ts": m41,
	"music_proximity.ts": m42,
	"numberBeautifuer.ts": m43,
	"os_utils.ts": m44,
	"ownerHelper.ts": m45,
	"permissonsCalculator.ts": m46,
	"prefix.ts": m47,
	"random.ts": m48,
	"randomExpression.ts": m49,
	"retrieveMyself.ts": m50,
	"roleSelectMenu.ts": m51,
	"sanitizeInteractionOptionValue.ts": m52,
	"sanitizer.ts": m53,
	"searchLyrics.ts": m54,
	"shard_helper.ts": m55,
	"svg2png.ts": m56,
	"svgKit.ts": m57,
	"tagHelper.ts": m58,
	"tempVoiceCandidate.ts": m59,
	"typeGuards.ts": m60,
	"userStatsUtils.ts": m61,
	"utcSelect.ts": m62,
	"validImageType.ts": m63,
	"wait.ts": m64,
	"welcomerEmbed.ts": m65,
	"welcomerMessage.ts": m66
};

export default files;
