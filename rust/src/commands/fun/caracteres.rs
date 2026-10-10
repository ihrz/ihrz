use super::*;

/// Full font table. Mirrors `fontStyles` in `!caracteres.ts` (key, ascii alias, table).
/// Two TS tables are short (60 chars, not 62); `convert_text` passes
/// unmapped chars through, mirroring the TS `charMap[char] || char` fallback.
const FONT_TABLES: &[(&str, &str, &str)] = &[
    (
        "𝗕𝗼𝗹𝗱",
        "bold",
        "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵",
    ),
    (
        "𝓢𝓬𝓻𝓲𝓹𝓽",
        "script",
        "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐ℬ𝓒𝓓𝓔ℱ𝓖ℋ𝓘𝓙𝓚ℒℳ𝓝𝓞𝓟𝓠ℛ𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
    ),
    (
        "𝕯𝖔𝖚𝖇𝖑𝖊",
        "double",
        "𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅0123456789",
    ),
    (
        "𝔦𝔞𝔩𝔦𝔠",
        "italic",
        "𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍0123456789",
    ),
    (
        "𝒮𝒶𝓃𝓈",
        "sans",
        "𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕0123456789",
    ),
    (
        "𝔞𝔱𝔦𝔦𝔠",
        "gothic",
        "𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ0123456789",
    ),
    (
        "𝐌𝐨𝐧𝐨",
        "mono",
        "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
    ),
    (
        "ꜱᴍᴀʟʟ",
        "small",
        "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀSᴛᴜᴠᴡXʏᴢ₀₁₂₃₄₅₆₇₈₉",
    ),
    (
        "ᵀⁱⁿʸ",
        "tiny",
        "ᵃᵇᶜᵈᵉᶠᵍʰᶤʲᵏˡᵐᶰᵒᵖᵠʳᶳᵗᵘᵛʷˣʸᶻᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿᶳᵀᵁᵛᵂᵡᵞᶻ⁰¹²³⁴⁵⁶⁷⁸⁹",
    ),
    (
        "🇫🇺🇱🇱",
        "full",
        "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９",
    ),
    (
        "Ⓒⓘⓡⓒⓛⓔⓓ",
        "circled",
        "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨",
    ),
    (
        "Ⴑⴞⴙⴓⴊⴊⴁⴤ",
        "shan",
        "αвcdeғɢнιjĸlмɴopqrѕтυvwхyzαвCDEғɢнιJĸLмɴOPQRѕтυVWхYZ0123456789",
    ),
    (
        "𝕊𝕦𝕡𝕖𝕣",
        "super",
        "ΛϦㄈÐƐFƓнɪﾌҚŁ௱ЛØþҨ尺らŤЦƔƜχϤẔΛϦㄈÐƐFƓнɪﾌҚŁ௱ЛØþҨ尺らŤЦƔƜχϤẔ0123456789",
    ),
    (
        "αѕнтяєѕ",
        "asian",
        "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘϙʀSᴛᴜᴠᴡXʏᴢ₀₁₂₃₄₅₆₇₈₉",
    ),
    (
        "αякѕє",
        "runic",
        "ΛßƇDƐFƓĤĪĴҠĿMИ♡ṖҨŔSƬƱѴѠӾYZΛßƇDƐFƓĤĪĴҠĿMИ♡ṖҨŔSƬƱѴѠӾYZ0123456789",
    ),
    (
        "Ꮆ𝐓𝐢𝐤",
        "thai",
        "ค๖¢໓ēfງhiวkl๓ຖ໐p๑rŞtนງຟxฯຊค๖¢໓ēfງhiวkl๓ຖ໐p๑rŞtนງຟxฯຊ0123456789",
    ),
    (
        "𝘽𝙪𝙗𝙗𝙡𝙚",
        "bubble",
        "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨",
    ),
    (
        "𝘽𝙡𝙪𝙚",
        "blue",
        "ค๒ς๔єŦɠђเןкl๓ภ๏թợгรtยvฬxץzค๒ς๔єŦɠђเןкl๓ภ๏թợгรtยvฬxץz0123456789",
    ),
    (
        "𝒿𝒶𝓃𝒸𝓎",
        "fancy",
        "ΛЅℭↁℰℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤάЅℭↁℰℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤ0123456789",
    ),
    (
        "𝓯𝓾𝓷𝓴𝔂",
        "funky",
        "ʌƅƈɗєƒʛɦɪʝƙʅɱɲơƥƣɾƨƭυvɯҳɣȥʌƅƈɗєƒʛɦɪʝƙʅɱɲơƥƣɾƨƭυVɯҳɣȥ0123456789",
    ),
    (
        "𝔦𝔤𝔞𝔪𝔦",
        "igami",
        "ǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐ0123456789",
    ),
    (
        "𝔞𝔦𝔞𝔦",
        "aiai",
        "ΛɓℭḊЄℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤΛɓℭḊЄℱ₲ℌℑ♤ΚŁℳℕ⊕ℚЯՏ₮ᵾ✓ᗯ✗ץℤ0123456789",
    ),
    (
        "𝔦𝔞𝔪𝔰",
        "iams",
        "ק๒ɔ໓ē£ງhเן๏ɭ๓ຖ໐ק๑rŞtนง山xyƵקב↻໓ē£ງhเן๏ɭ๓ຖ໐ק๑rŞtนง山xyƵ0123456789",
    ),
    (
        "𝔦𝔦𝔦𝔞",
        "iiia",
        "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ₀₁₂₃₄₅₆₇₈₉",
    ),
    (
        "𝔦𝔪𝔞𝔶",
        "imay",
        "ḀʙͻⅮḚḞĠӇłⱮƘɭᴹŇṌṔҨŘṠƬᵁᴙᴿXȲƵḀʙͻⅮḚḞĠӇłⱮƘɭᴹŇṌṔҨŘṠƬᵁᴙᴿXȲƵ0123456789",
    ),
    (
        "𝔢𝔦𝔤𝔞",
        "eiga",
        "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ₀₁₂₃₄₅₆₇₈₉",
    ),
];

/// Original alphabet. Mirrors `fontStyles["Original"]`.
pub const FONT_ORIGINAL: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/// Style keys in TS declaration order (the select menu shows the first 25).
pub fn style_names() -> Vec<&'static str> {
    FONT_TABLES.iter().map(|(k, _, _)| *k).collect()
}

/// Pure port of `convertText(text, style)` in `!caracteres.ts`.
/// Matches the styled key exactly or the ascii alias case-insensitively;
/// unknown styles return `None`. Ragged tables fall through per character,
/// mirroring the TS `charMap[char] || char` fallback.
pub fn convert_text(text: &str, style: &str) -> Option<String> {
    let table = FONT_TABLES
        .iter()
        .find(|(k, a, _)| *k == style || a.eq_ignore_ascii_case(style))
        .map(|(_, _, t)| *t)?;
    let orig: Vec<char> = FONT_ORIGINAL.chars().collect();
    let styled: Vec<char> = table.chars().collect();
    Some(
        text.chars()
            .map(|c| {
                orig.iter()
                    .position(|&o| o == c)
                    .and_then(|i| styled.get(i).copied())
                    .unwrap_or(c)
            })
            .collect(),
    )
}

/// Select-menu custom id. Mirrors `font_style_select` in `!caracteres.ts`.
pub const FONT_SELECT_ID: &str = "font_style_select";

/// Collector lifetime. Mirrors `time: 60_000 * 7` (7 minutes).
pub const FONT_COLLECTOR_SECS: u64 = 7 * 60;

/// Styles shown in the select menu: TS declaration order minus `Original`,
/// first 25 (`.filter(s => s !== "Original").slice(0, 25)`).
pub fn menu_styles() -> Vec<&'static str> {
    style_names().into_iter().take(25).collect()
}

/// Option description: `${var_preview}: ${converted}`, untruncated like
/// the TS `setDescription` call in `!caracteres.ts` (no 100-char cap there).
pub fn preview_desc(preview_word: &str, converted: &str) -> String {
    format!("{preview_word}: {converted}")
}

/// Transform a string into a DarkSasuke!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "caracteres")]
pub async fn caracteres(
    ctx: Ctx<'_>,
    // Named `nickname` like the TS slash option (`getString("nickname")`,
    // required: true in fun.ts). Optional here so prefix can show the
    // provide-text prompt instead of a parse error.
    #[description = "Text to transform"]
    #[rest]
    nickname: Option<String>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let Some(input) = nickname.filter(|s| !s.is_empty()) else {
        ctx.say(f(
            "fun_caracteres_command_ok",
            "Please provide a text to transform!",
        ))
        .await?;
        return Ok(());
    };
    let preview_word = f("var_preview", "Preview");
    let options: Vec<poise::serenity_prelude::CreateSelectMenuOption> = menu_styles()
        .iter()
        .map(|style| {
            let converted = convert_text(&input, style).unwrap_or_else(|| input.clone());
            poise::serenity_prelude::CreateSelectMenuOption::new(
                style.to_string(),
                style.to_string(),
            )
            .description(preview_desc(&preview_word, &converted))
        })
        .collect();
    let menu = poise::serenity_prelude::CreateSelectMenu::new(
        FONT_SELECT_ID,
        poise::serenity_prelude::CreateSelectMenuKind::String { options },
    )
    .placeholder(f(
        "fun_caracteres_select_menu_placeholder",
        "Choose a font style...",
    ));
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(f("fun_caracteres_help_title", "Select a text style"))
        .description(
            f(
                "fun_caracteres_embed_desc",
                "Original text: **${inputText}**",
            )
            .replace("${inputText}", &input),
        )
        .colour(0x3498dbu32)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let author = ctx.author().id;
    let not_for_you = f("help_not_for_you", "This interaction is not for you");
    let title_tpl = f(
        "fun_caracteres_final_embed_title",
        "Transformed Text - Style: ${selectedStyle}",
    );
    let field1 = f("fun_caracteres_final_embed_field1_name", "Original Text");
    let field2 = f("fun_caracteres_final_embed_field2_name", "Transformed Text");
    let handle = ctx
        .send(poise::CreateReply::default().embed(embed).components(vec![
            poise::serenity_prelude::CreateActionRow::SelectMenu(menu),
        ]))
        .await?;
    let mut msg = handle.into_message().await?;
    // Collector: author-only picks, 7-minute window like the TS collector.
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(FONT_COLLECTOR_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.data.custom_id != FONT_SELECT_ID {
            continue;
        }
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    poise::serenity_prelude::CreateInteractionResponse::Message(
                        poise::serenity_prelude::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let selected = match &press.data.kind {
            poise::serenity_prelude::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        let converted = convert_text(&input, &selected).unwrap_or_else(|| input.clone());
        let result = poise::serenity_prelude::CreateEmbed::default()
            .title(title_tpl.replace("${selectedStyle}", &selected))
            .field(field1.clone(), format!("```{input}```"), false)
            .field(field2.clone(), format!("```{converted}```"), false)
            .colour(0x2ecc71u32)
            .timestamp(poise::serenity_prelude::Timestamp::now());
        let _ = press
            .create_response(
                ctx.http(),
                poise::serenity_prelude::CreateInteractionResponse::UpdateMessage(
                    poise::serenity_prelude::CreateInteractionResponseMessage::new().embed(result),
                ),
            )
            .await;
        break;
    }
    // Disable-on-end: strip the menu like the TS `end` handler.
    let _ = msg
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditMessage::new().components(vec![]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod caracteres_tests {
    use super::*;

    #[test]
    fn all_26_styles_cover_alphabet() {
        assert_eq!(FONT_TABLES.len(), 26);
        assert_eq!(style_names().len(), 26);
        for (key, alias, _) in FONT_TABLES {
            let out = convert_text("azAZ09", key).unwrap();
            assert_eq!(out.chars().count(), 6, "style {alias}");
            // Alias resolves to the same output.
            assert_eq!(convert_text("azAZ09", alias).unwrap(), out);
            assert_eq!(
                convert_text("azAZ09", &alias.to_ascii_uppercase()).unwrap(),
                out
            );
        }
    }

    #[test]
    fn bold_matches_ts_index_map() {
        assert_eq!(convert_text("abZ09", "bold").unwrap(), "𝗮𝗯𝗭𝟬𝟵");
    }

    #[test]
    fn ragged_tables_fall_through_like_ts() {
        // `fancy` and `aiai` tables are 60 chars in the TS source, so
        // Original[60..61] ("8"/"9") stay unmapped (TS: undefined ->
        // passthrough via `charMap[char] || char`). Expected values below
        // were verified against the TS `convertText` runtime.
        assert_eq!(convert_text("0123456789", "fancy").unwrap(), "2345678989");
        assert_eq!(convert_text("89", "aiai").unwrap(), "89");
        // Letters map fully.
        let fancy = convert_text("abcdefghijklmnopqrstuvwxyz", "fancy").unwrap();
        assert_eq!(fancy.chars().count(), 26);
        assert!(!fancy.contains('a'));
        assert!(convert_text("hello!", "funky").unwrap().ends_with('!'));
    }

    #[test]
    fn unknown_style_is_none() {
        assert!(convert_text("hi", "nope").is_none());
        assert!(convert_text("hi", "").is_none());
    }

    #[test]
    fn menu_shows_first_25_styles() {
        let menu = menu_styles();
        assert_eq!(menu.len(), 25);
        assert_eq!(menu[0], style_names()[0]);
        assert_eq!(menu[24], style_names()[24]);
    }

    #[test]
    fn preview_desc_matches_ts_untruncated() {
        let short = preview_desc("Preview", "abc");
        assert_eq!(short, "Preview: abc");
        // TS applies no 100-char cap: long previews pass through whole.
        let long = preview_desc("Preview", &"x".repeat(200));
        assert_eq!(long, format!("Preview: {}", "x".repeat(200)));
    }
}
