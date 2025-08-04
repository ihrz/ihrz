/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	Message,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const fontStyles = {
	"Original": [...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")],
	"𝗕𝗼𝗹𝗱": [...("𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵")],
	"𝓢𝓬𝓻𝓲𝓹𝓽": [...("𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐ℬ𝓒𝓓𝓔ℱ𝓖ℋ𝓘𝓙𝓚ℒℳ𝓝𝓞𝓟𝓠ℛ𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗")],
	"𝕯𝖔𝖚𝖇𝖑𝖊": [...("𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅0123456789")],
	"𝔦𝔞𝔩𝔦𝔠": [...("𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍0123456789")],
	"𝒮𝒶𝓃𝓈": [...("𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕0123456789")],
	"𝔞𝔱𝔦𝔦𝔠": [...("𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ0123456789")],
	"𝐌𝐨𝐧𝐨": [...("𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿")],
	"ꜱᴍᴀʟʟ": [...("ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀSᴛᴜᴠᴡXʏᴢ₀₁₂₃₄₅₆₇₈₉")],
	"ᵀⁱⁿʸ": [...("ᵃᵇᶜᵈᵉᶠᵍʰᶤʲᵏˡᵐᶰᵒᵖᵠʳᶳᵗᵘᵛʷˣʸᶻᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿᶳᵀᵁᵛᵂᵡᵞᶻ⁰¹²³⁴⁵⁶⁷⁸⁹")],
	"🇫🇺🇱🇱": [...("ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９")],
	"Ⓒⓘⓡⓒⓛⓔⓓ": [...("ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨")],
	"Ⴑⴞⴙⴓⴊⴊⴁⴤ": [...("αвcdeғɢнιjĸlмɴopqrѕтυvwхyzαвCDEғɢнιJĸLмɴOPQRѕтυVWхYZ0123456789")],
	"𝕊𝕦𝕡𝕖𝕣": [...("ΛϦㄈÐƐFƓнɪﾌҚŁ௱ЛØþҨ尺らŤЦƔƜχϤẔΛϦㄈÐƐFƓнɪﾌҚŁ௱ЛØþҨ尺らŤЦƔƜχϤẔ0123456789")],
	"αѕнтяєѕ": [...("ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀSᴛᴜᴠᴡXʏᴢ₀₁₂₃₄₅₆₇₈₉")],
	"αякѕє": [...("ΛßƇDƐFƓĤĪĴҠĿMИ♡ṖҨŔSƬƱѴѠӾYZΛßƇDƐFƓĤĪĴҠĿMИ♡ṖҨŔSƬƱѴѠӾYZ0123456789")],
	"Ꮆ𝐓𝐢𝐤": [...("ค๖¢໓ēfງhiวkl๓ຖ໐p๑rŞtนງຟxฯຊค๖¢໓ēfງhiวkl๓ຖ໐p๑rŞtนງຟxฯຊ0123456789")],
	"𝘽𝙪𝙗𝙗𝙡𝙚": [...("ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨")],
	"𝘽𝙡𝙪𝙚": [...("ค๒ς๔єŦɠђเןкl๓ภ๏թợгรtยvฬxץzค๒ς๔єŦɠђเןкl๓ภ๏թợгรtยvฬxץz0123456789")],
	"𝒿𝒶𝓃𝒸𝓎": [...("ΛЅℭↁℰℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤάЅℭↁℰℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤ0123456789")],
	"𝓯𝓾𝓷𝓴𝔂": [...("ʌƅƈɗєƒʛɦɪʝƙʅɱɲơƥƣɾƨƭυvɯҳɣȥʌƅƈɗєƒʛɦɪʝƙʅɱɲơƥƣɾƨƭυVɯҳɣȥ0123456789")],
	"𝔦𝔤𝔞𝔪𝔦": [...("ǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐ0123456789")],
	"𝔞𝔦𝔞𝔦": [...("ΛɓℭḊЄℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤΛɓℭḊЄℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤ0123456789")],
	"𝔦𝔞𝔪𝔰": [...("ק๒ɔ໓ē£ງhเן๏ɭ๓ຖ໐ק๑rŞtนง山xyƵקב↻໓ē£ງhเן๏ɭ๓ຖ໐ק๑rŞtนง山xyƵ0123456789")],
	"𝔦𝔦𝔦𝔞": [...("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ₀₁₂₃₄₅₆₇₈₉")],
	"𝔦𝔪𝔞𝔶": [...("ḀʙͻⅮḚḞĠӇłⱮƘɭᴹŇṌṔҨŘṠƬᵁᴙᴿXȲƵḀʙͻⅮḚḞĠӇłⱮƘɭᴹŇṌṔҨŘṠƬᵁᴙᴿXȲƵ0123456789")],
	"𝔢𝔦𝔤𝔞": [...("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ₀₁₂₃₄₅₆₇₈₉")]
}

function convertText(text: string, style: string): string {
	if (!text || text.length === 0) return text;

	const originalChars = fontStyles["Original"];
	const styleChars = fontStyles[style as keyof typeof fontStyles];

	if (!styleChars) return text;

	const charMap: Record<string, string> = {};
	for (let i = 0; i < originalChars.length; i++) {
		charMap[originalChars[i]] = styleChars[i];
	}

	const textChars = [...text];
	let result = '';

	for (const char of textChars) {
		result += charMap[char] || char;
	}

	return result;
}

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
			await client.func.method.interactionSend(interaction, { content: lang.fun_category_disable });
			return;
		};

		let inputText: string;
		if (interaction instanceof ChatInputCommandInteraction) {
			inputText = interaction.options.getString("nickname") || '';
		} else {
			inputText = client.func.method.longString(args!, 0) || '';
		}

		if (!inputText) {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_caracteres_command_ok
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(lang.fun_caracteres_help_title)
			.setDescription(lang.fun_caracteres_embed_desc.replace("${inputText}", inputText))
			.setColor(0x3498db)
			.setTimestamp();

		const options = Object.keys(fontStyles)
			.filter(style => style !== "Original")
			.slice(0, 25)
			.map(style =>
				new StringSelectMenuOptionBuilder()
					.setLabel(style)
					.setValue(style)
					.setDescription(`${lang.var_preview}: ${convertText(inputText, style)}`)
			);

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('font_style_select')
			.setPlaceholder(lang.fun_caracteres_select_menu_placeholder)
			.addOptions(options);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(selectMenu);

		const response = await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			components: [row]
		});

		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 60000 // 1 minute
		});

		collector.on('collect', async (selectInteraction) => {
			if (selectInteraction.user.id !== (interaction instanceof ChatInputCommandInteraction ? interaction.user.id : interaction.author.id)) {
				await selectInteraction.reply({
					content: lang.help_not_for_you,
					ephemeral: true
				});
				return;
			}

			const selectedStyle = selectInteraction.values[0];
			const convertedText = convertText(inputText, selectedStyle);

			// Créer l'embed de résultat
			const resultEmbed = new EmbedBuilder()
				.setTitle(lang.fun_caracteres_final_embed_title.replace("${selectedStyle}", selectedStyle))
				.addFields(
					{ name: lang.fun_caracteres_final_embed_field1_name, value: `\`\`\`${inputText}\`\`\``, inline: false },
					{ name: lang.fun_caracteres_final_embed_field2_name, value: `\`\`\`${convertedText}\`\`\``, inline: false }
				)
				.setColor(0x2ecc71)
				.setTimestamp();

			await selectInteraction.update({
				embeds: [resultEmbed],
				components: []
			});
		});

		collector.on('end', async () => {
			try {
				await response.edit({
					components: []
				});
			} catch (error) {
			}
		});

		return;
	},
};