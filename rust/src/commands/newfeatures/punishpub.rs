use super::*;

/// Punishpub status choice. Mirrors the `status` option `choices` in
/// punishpub.ts:58-75: slash shows `ON` / `OFF` (localized), the
/// handler maps each variant back to the TS `value` (`true` /
/// `false`), which doubles as the prefix alias (`on`/`off` match the
/// display names case-insensitively).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PunishpubStatus {
    #[name = "ON"]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "on")]
    #[name_localized("ru", "on")]
    #[name_localized("es-ES", "on")]
    #[name = "true"]
    On,
    #[name = "OFF"]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "off")]
    #[name_localized("ru", "off")]
    #[name_localized("es-ES", "off")]
    #[name = "false"]
    Off,
}

impl PunishpubStatus {
    /// TS `value` (`true` / `false`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "true",
            Self::Off => "false",
        }
    }
}

/// Punishpub punishment choice. Mirrors the `punishement` option
/// `choices` in punishpub.ts:111-141 (TS-side typo kept): slash shows
/// the localized display names, the handler stores the TS `value`
/// verbatim.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PunishpubKind {
    #[name = "BAN"]
    #[name_localized("fr", "Bannir")]
    #[name_localized("ja", "ban")]
    #[name_localized("ru", "ban")]
    #[name_localized("es-ES", "ban")]
    #[name = "ban"]
    Ban,
    #[name = "KICK"]
    #[name_localized("fr", "Expulser")]
    #[name_localized("ja", "kick")]
    #[name_localized("ru", "kick")]
    #[name_localized("es-ES", "kick")]
    #[name = "kick"]
    Kick,
    #[name = "MUTE"]
    #[name_localized("fr", "Muter")]
    #[name_localized("ja", "mute")]
    #[name_localized("ru", "mute")]
    #[name_localized("es-ES", "mute")]
    #[name = "mute"]
    Mute,
}

impl PunishpubKind {
    /// TS `value` stored as `punishementType`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ban => "ban",
            Self::Kick => "kick",
            Self::Mute => "mute",
        }
    }
}

/// Anti-pub spam config (amount/type/state).
// Mirrors punishpub.ts: `status` is `"true"`/`"false"` on slash
// (`"on"`/`"off"` accepted as prefix aliases). The enable leg runs
// only when status is on AND an amount is given (TS
// `amount && action == "true"`): it validates, writes
// `{amountMax: amount - 1, punishementType, state: "true"}`, logs
// and confirms. Every other combination (off, or on without an
// amount) falls to the disable leg, which deletes the row.
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "punishpub",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Punir l'utilisateur lorsqu'il envoie trop de publicité"),
    description_localized("ja", "広告を送りすぎたユーザーを罰する！"),
    description_localized("ru", "Наказать пользователя за чрезмерную рекламу!"),
    description_localized("es-ES", "Castigar al usuario cuando envía demasiada publicidad!")
)]
pub async fn punishpub(
    ctx: Ctx<'_>,
    #[description = "Flags before sanction"] amount: Option<i64>,
    // TS SlashCommands/newfeatures/punishpub.ts registers "punishement" (TS-side typo, kept for parity).
    #[description = "ban, kick or mute"]
    #[rename = "punishement"]
    punishment: Option<PunishpubKind>,
    // TS registers the on/off toggle as "status".
    #[description = "true or false (on/off accepted on prefix)"]
    #[rename = "status"]
    action: Option<PunishpubStatus>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let uid = ctx.author().id.get().to_string();
    // Slash choices send "true"/"false"; prefix on/off match the
    // display names, so the mapped value is already canonical.
    let on = matches!(action.map(|a| a.as_str()), Some("true"));
    // Enable leg (TS `amount && action == "true"`): amount present and
    // status on. Amount validation mirrors TS (over 50, negative and
    // zero each get their own reply; `== 0` is unreachable in TS
    // since 0 is falsy there, but the key exists, so it is kept).
    if on {
        if let Some(a) = amount {
            if a > 50 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_too_hight_enable").unwrap_or_else(|| {
                        "The amount is too high! It's not recommended!".to_string()
                    }),
                )
                .await?;
                return Ok(());
            }
            if a < 0 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_negative_number_enable")
                        .unwrap_or_else(|| "You can't enter a negative number!".to_string()),
                )
                .await?;
                return Ok(());
            }
            if a == 0 {
                ctx.say(
                    crate::lang::get(&code, "punishpub_zero_number_enable")
                        .unwrap_or_else(|| "The number 0 is not possible!".to_string()),
                )
                .await?;
                return Ok(());
            }
            let amount_s = a.to_string();
            // TS stores `punishementType: punishment` verbatim (possibly
            // undefined, which JSON drops); None omits the key here so
            // the reader default (`"ban"`) applies the same way.
            let kind_s = punishment.map(|k| k.as_str().to_string());
            let mut cfg = serde_json::json!({"amountMax": a - 1, "state": "true"});
            if let Some(k) = kind_s.clone() {
                cfg["punishementType"] = serde_json::Value::String(k);
            }
            crate::db::tbl_set_json(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB", &cfg)
                .await?;
            let kind_tpl = kind_s.unwrap_or_else(|| "undefined".to_string());
            let log_title =
                crate::lang::get(&code, "punishpub_logs_embed_title").unwrap_or_default();
            let log_desc = crate::lang::get(&code, "punishpub_logs_embed_description")
                .unwrap_or_default()
                .replace("${interaction.user.id}", &uid)
                .replace("${amount}", &amount_s)
                .replace("${punishement}", &kind_tpl);
            crate::commands::economy::post_ihorizon_log(&ctx, &log_title, &log_desc).await;
            let confirm = crate::lang::get(&code, "punishpub_confirmation_message_enable")
                .unwrap_or_else(|| "Punishpub enabled.".to_string())
                .replace("${interaction.user.id}", &uid)
                .replace("${amount}", &amount_s)
                .replace("${punishement}", &kind_tpl);
            ctx.say(confirm).await?;
            return Ok(());
        }
    }
    // Disable leg (TS else branch: action off, or on without an
    // amount). The pub reader (`punish_pub_routed` in
    // events_handler.rs) loads exactly this `GUILD.PUNISH.PUNISH_PUB`
    // leaf, so deleting the row turns the pipeline off.
    crate::db::tbl_del(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await?;
    ctx.say(
        crate::lang::get(&code, "punishpub_confirmation_disable")
            .unwrap_or_else(|| "Punishpub disabled.".to_string()),
    )
    .await?;
    let log_title =
        crate::lang::get(&code, "punishpub_logs_embed_title_disable").unwrap_or_default();
    let log_desc = crate::lang::get(&code, "punishpub_logs_embed_description_disable")
        .unwrap_or_default()
        .replace("${interaction.user.id}", &uid);
    crate::commands::economy::post_ihorizon_log(&ctx, &log_title, &log_desc).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::PunishpubKind;
    use super::PunishpubStatus;

    #[test]
    fn punishpub_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = PunishpubStatus::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["ON".to_string(), "OFF".to_string()]);
        assert_eq!(PunishpubStatus::On.as_str(), "true");
        assert_eq!(PunishpubStatus::Off.as_str(), "false");
        assert_eq!(PunishpubStatus::from_name("ON"), Some(PunishpubStatus::On));
        assert_eq!(
            PunishpubStatus::from_name("off"),
            Some(PunishpubStatus::Off)
        );
        assert_eq!(
            PunishpubStatus::from_name("true"),
            Some(PunishpubStatus::On)
        );
        assert_eq!(
            PunishpubStatus::from_name("false"),
            Some(PunishpubStatus::Off)
        );
        assert_eq!(PunishpubStatus::from_name("bogus"), None);
        assert_eq!(PunishpubStatus::from_index(0), Some(PunishpubStatus::On));
        assert_eq!(PunishpubStatus::from_index(1), Some(PunishpubStatus::Off));
        let kinds: Vec<_> = PunishpubKind::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            kinds,
            vec!["BAN".to_string(), "KICK".to_string(), "MUTE".to_string()]
        );
        assert_eq!(PunishpubKind::Ban.as_str(), "ban");
        assert_eq!(PunishpubKind::Kick.as_str(), "kick");
        assert_eq!(PunishpubKind::Mute.as_str(), "mute");
        assert_eq!(PunishpubKind::from_name("BAN"), Some(PunishpubKind::Ban));
        assert_eq!(PunishpubKind::from_name("mute"), Some(PunishpubKind::Mute));
        assert_eq!(PunishpubKind::from_name("jail"), None);
        assert_eq!(PunishpubKind::from_index(2), Some(PunishpubKind::Mute));
        let list = PunishpubStatus::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        let kinds = PunishpubKind::list();
        assert_eq!(
            kinds[0].localizations.get("fr").map(String::as_str),
            Some("Bannir")
        );
        assert_eq!(
            kinds[1].localizations.get("fr").map(String::as_str),
            Some("Expulser")
        );
        assert_eq!(
            kinds[2].localizations.get("fr").map(String::as_str),
            Some("Muter")
        );
        assert_eq!(PunishpubKind::Mute.localized_name("ja"), Some("mute"));
    }
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn punishpub_blob_reads_legacy_only_row() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.PUNISH.PUNISH_PUB",
            r#"{"amountMax":4,"punishementType":"mute","state":"true"}"#,
        )
        .await
        .unwrap();
        let raw = crate::db::tbl_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("legacy row");
        let cfg: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(cfg["amountMax"], 4);
        assert_eq!(cfg["state"], "true");
    }

    #[tokio::test]
    async fn punishpub_blob_dual_writes_table_and_legacy() {
        let pool = mem_pool().await;
        let cfg = serde_json::json!({"amountMax": 4, "punishementType": "mute", "state": "true"});
        crate::db::tbl_set_json(&pool, "g", "GUILD.PUNISH.PUNISH_PUB", &cfg)
            .await
            .unwrap();
        // Legacy kv row keeps the JSON text.
        let raw = crate::db::kv_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("legacy row");
        let back: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(back["amountMax"], 4);
        // Table-first read hits.
        let via_table = crate::db::tbl_get(&pool, "g", "GUILD.PUNISH.PUNISH_PUB")
            .await
            .expect("table row");
        let tv: serde_json::Value = serde_json::from_str(&via_table).unwrap();
        assert_eq!(tv["punishementType"], "mute");
    }
    #[test]
    fn punishpub_registers_description_localizations() {
        let cmd = super::punishpub();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Punir l'utilisateur lorsqu'il envoie trop de publicité")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("広告を送りすぎたユーザーを罰する！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Наказать пользователя за чрезмерную рекламу!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Castigar al usuario cuando envía demasiada publicidad!")
        );
    }
}
