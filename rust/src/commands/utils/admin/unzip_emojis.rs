use super::*;

// Upload emojis from a zip attachment. Mirrors !unzip-emojis.ts.
/// Recreate all emojis from a zip file
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unzip-emojis",
    aliases("unzipemojis", "unzip1"),
    default_member_permissions = "MANAGE_GUILD_EXPRESSIONS",
    description_localized("fr", "Recreer tout les emojis depuis un fichier zip"),
    description_localized("ja", "ZIPファイルから全絵文字を再作成"),
    description_localized("ru", "Воссоздать все эмодзи из ZIP-файла"),
    description_localized("es-ES", "Recrear todos los emojis desde un archivo zip")
)]
pub async fn unzip_emojis(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le fichier zip pour recréer les emojis")]
    #[description_localized("ja", "絵文字を再作成するZIPファイル")]
    #[description_localized("ru", "ZIP-файл для воссоздания эмодзи")]
    #[description_localized("es-ES", "El archivo zip para recrear emojis")]
    #[description = "The zip file to recreate emojis"]
    #[rename = "zip_file"]
    attachment: Option<poise::serenity_prelude::Attachment>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    // Prefix counts-first gate (TS util.ts unzip-emojis decl:
    // `zip_file` required:true, executor checkCommandArgs runs before
    // run): a prefix message carries no attachment, so the required
    // attachment leg renders the caret usage embed (`+util
    // unzip-emojis [attachment]`, prod WAVE-af 1560204187705548871),
    // never the no-file content leg (addrolereact precedent).
    if let poise::Context::Prefix(_) = ctx {
        if attachment.is_none() {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // TS no-file guard (!unzip-emojis.ts:50-56): reachable on slash
    // only now (prefix without attachments is gated above); the prefix
    // path reads `interaction.attachments.first()`, which may be missing.
    let Some(attachment) = attachment else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.send(
            poise::CreateReply::default()
                .content(
                    crate::lang::get(&code, "util_unzip_emojis_command_no_file")
                        .unwrap_or_else(|| "Please attach a zip file.".to_string()),
                )
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    };
    // TS wraps the whole run in try/catch answering
    // `util_unzip_emojis_command_error` (ephemeral).
    let started = std::time::Instant::now();
    let bytes = match reqwest::Client::new().get(&attachment.url).send().await {
        Ok(r) => r.bytes().await.unwrap_or_default().to_vec(),
        Err(_) => {
            return unzip_failed(&ctx).await;
        }
    };
    let reader = std::io::Cursor::new(bytes);
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(_) => {
            return unzip_failed(&ctx).await;
        }
    };
    let mut pending: Vec<(String, String, Vec<u8>)> = vec![];
    // TS (!unzip-emojis.ts:69-92): keep only `name_<id>.png|gif` entries,
    // clean the name (`_` -> space, strip non-word chars, 32 max), skip
    // emojis already in cache, then cap at 50.
    let cached: Vec<String> = guild_id
        .emojis(ctx.http())
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|e| e.name)
        .collect();
    for i in 0..archive.len() {
        if pending.len() >= 50 {
            break;
        }
        let mut file = match archive.by_index(i) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let Some((emoji_name, ext)) = clean_unzip_name(file.name()) else {
            continue;
        };
        if cached.iter().any(|n| n == &emoji_name) {
            continue;
        }
        let mut data = vec![];
        use std::io::Read;
        if file.read_to_end(&mut data).is_err() || data.is_empty() {
            continue;
        }
        pending.push((emoji_name, ext, data));
    }
    drop(archive);
    let mut done = 0;
    for (emoji_name, ext, data) in pending {
        let image = format!(
            "data:image/{ext};base64,{}",
            crate::emojis::base64_encode(&data)
        );
        if guild_id
            .create_emoji(ctx.http(), &emoji_name, &image)
            .await
            .is_ok()
        {
            done += 1;
        }
    }
    // Mirrors `util_unzip_emojis_command_work` (${calcTime}, ${emojiCount}).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let calc = started.elapsed().as_millis();
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::lang::get(&code, "util_unzip_emojis_command_work")
                    .map(|s| {
                        s.replace("${calcTime}", &calc.to_string())
                            .replace("${emojiCount}", &done.to_string())
                    })
                    .unwrap_or_else(|| format!("Created {done} emoji(s).")),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

// Clean one zip entry into `(emoji_name, ext)`. Mirrors the TS filter
// (!unzip-emojis.ts:74-81): bare `name_<id>.png|gif`, `_` -> space,
// strip non-word chars, 32 chars max. `None` rejects the entry.
pub fn clean_unzip_name(path: &str) -> Option<(String, String)> {
    let bare = path.rsplit('/').next().unwrap_or(path);
    let (stem, ext) = bare.rsplit_once('.')?;
    if ext != "png" && ext != "gif" {
        return None;
    }
    let (name, id) = stem.rsplit_once('_')?;
    if name.is_empty() || id.is_empty() || !id.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let cleaned: String = name
        .replace('_', " ")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || c.is_ascii_whitespace())
        .take(32)
        .collect();
    Some((cleaned, ext.to_string()))
}

// Ephemeral `util_unzip_emojis_command_error` reply. Mirrors the TS
// try/catch around the whole run (download + unzip failures).
async fn unzip_failed(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.send(
        poise::CreateReply::default()
            .content(
                crate::lang::get(&code, "util_unzip_emojis_command_error")
                    .unwrap_or_else(|| "An error occurred while unzipping emojis.".to_string()),
            )
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_id_filter_mirrors_ts_regex() {
        assert_eq!(
            clean_unzip_name("smile_123.png"),
            Some(("smile".to_string(), "png".to_string()))
        );
        // Greedy `(.+)`: the LAST `_digits` split wins, `_` -> space.
        assert_eq!(
            clean_unzip_name("my_cool_emoji_456.gif"),
            Some(("my cool emoji".to_string(), "gif".to_string()))
        );
        // Folders are stripped to the bare filename.
        assert_eq!(
            clean_unzip_name("a/b/c_789.png"),
            Some(("c".to_string(), "png".to_string()))
        );
        // jpg rejected (png/gif only).
        assert_eq!(clean_unzip_name("smile_123.jpg"), None);
        // No numeric id suffix.
        assert_eq!(clean_unzip_name("smile.png"), None);
        assert_eq!(clean_unzip_name("smile_abc.png"), None);
        // Dirty chars stripped.
        assert_eq!(
            clean_unzip_name("a!b_c-1_9.png"),
            Some(("ab c1".to_string(), "png".to_string()))
        );
    }

    #[test]
    fn registry_key_matches_usage_override() {
        // The `choice_token_override` pin in prefix_args keys on the
        // runtime poise qualified name (`parent leaf`, filled by
        // poise's set_qualified_names at framework build, NOT present
        // on the raw `all()` vec): compose the path the same way so a
        // rename of either level fails here instead of silently
        // missing the override in prod.
        let cmds = crate::commands::all();
        let util = cmds
            .iter()
            .find(|c| c.name == "util")
            .expect("util parent missing");
        let leaf = util
            .subcommands
            .iter()
            .find(|c| c.name == "unzip-emojis")
            .expect("unzip-emojis leaf missing");
        assert_eq!(format!("{} {}", util.name, leaf.name), "util unzip-emojis");
        assert_eq!(leaf.parameters.len(), 1);
        assert_eq!(leaf.parameters[0].name, "zip_file");
    }
}
