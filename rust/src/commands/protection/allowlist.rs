use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

use super::protect::{
    allowlist_contains, allowlist_mentions, deny_unless_owner, guild_owner_id, is_guild_owner,
    load_allowlist,
};

/// Allowlist top-level group (add/remove/show allowlisted members).
// Mirrors the TS `allowlist` SlashCommand
// (`SlashCommands/protection/allowlist/allowlist.ts`): the run legs
// (`!add.ts`, `!remove.ts`, `!show.ts`) already live as
// `protect_allow_*` leaves under `protect`; this top re-exposes the
// same three legs under the TS slash path with byte-exact names and
// localizations.
#[poise::command(
    slash_command,
    prefix_command,
    category = "protection",
    rename = "allowlist",
    subcommands("allowlist_add", "allowlist_remove", "allowlist_show"),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie de protection"),
    description_localized("ja", "保護カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории защиты!"),
    description_localized("es-ES", "Subcomando para la categoría de protección!")
)]
pub async fn allowlist(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Adding an user in the allowlist!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    description_localized("fr", "Ajouter un utilisateur à la liste blanche"),
    description_localized("ja", "許可リストにユーザーを追加！"),
    description_localized("ru", "Добавить пользователя в белый список!"),
    description_localized("es-ES", "Añadiendo un usuario a la lista de permitidos!")
)]
pub async fn allowlist_add(
    ctx: Ctx<'_>,
    // TS allowlist.ts:55-69 reads getMember("member") (required User).
    #[description = "Whats is the member then?"]
    #[description_localized("fr", "Quel est le membre alors?")]
    #[description_localized("ja", "どのメンバーですか？")]
    #[description_localized("ru", "Какой участник?")]
    #[description_localized("es-ES", "Cual es el miembro entonces?")]
    #[rename = "member"]
    user: serenity::User,
) -> Result<(), anyhow::Error> {
    // TS !add.ts:50 is owner-only in code over `permission: null`
    // (the second guard at :57-65 is dead code since the owner check
    // above it always returns first).
    if deny_unless_owner(
        &ctx,
        "allowlist_add_not_owner",
        "Only the owner of the server can add/remove users in the allowlist!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS !add.ts:67-72: getMember resolves to null when the user is not
    // in the guild (unreachable member guard).
    if let Some(guild_id) = ctx.guild_id() {
        if guild_id.member(ctx.http(), user.id).await.is_err() {
            let msg =
                crate::lang::get(&code, "allowlist_add_member_unreachable").unwrap_or_else(|| {
                    "The member you wanted to add to the allowlist is unreachable!".to_string()
                });
            ctx.say(msg).await?;
            return Ok(());
        }
    }
    // TS !add.ts:74-79: already allowlisted guard.
    let existing = load_allowlist(&ctx.data().pool, &gid).await;
    if allowlist_contains(&existing, user.id.get()) {
        let msg = crate::lang::get(&code, "allowlist_add_already_in").unwrap_or_else(|| {
            "The member you want to add to the allowlist is already in it!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
        r#"{"allowed":true}"#,
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "allowlist_add_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been added to the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

/// Removing an user in the allowlist!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    description_localized("fr", "Supprimer un utilisateur de la liste blanche"),
    description_localized("ja", "許可リストからユーザーを削除！"),
    description_localized("ru", "Удалить пользователя из белого списка!"),
    description_localized("es-ES", "Eliminando un usuario de la lista de permitidos!")
)]
pub async fn allowlist_remove(
    ctx: Ctx<'_>,
    // TS allowlist.ts:88-102 reads getUser("member") (required User).
    #[description = "Whats is the member then?"]
    #[description_localized("fr", "Quel est le membre alors?")]
    #[description_localized("ja", "どのメンバーですか？")]
    #[description_localized("ru", "Какой участник?")]
    #[description_localized("es-ES", "Cual es el miembro entonces?")]
    #[rename = "member"]
    user: serenity::User,
) -> Result<(), anyhow::Error> {
    // TS !remove.ts:50 is owner-only in code over `permission: null`
    // (the second guard at :57-65 is dead code, same as !add.ts).
    if deny_unless_owner(
        &ctx,
        "allowlist_delete_not_owner",
        "Only the owner of the server can add/remove users in the allowlist!",
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS !remove.ts:74-79: the owner can never leave the allowlist.
    let owner = guild_owner_id(&ctx).await.unwrap_or(0);
    if user.id.get() == owner {
        let msg =
            crate::lang::get(&code, "allowlist_delete_cant_remove_owner").unwrap_or_else(|| {
                "It is not possible to remove the server owner from the allowlist!".to_string()
            });
        ctx.say(msg).await?;
        return Ok(());
    }
    // TS !remove.ts:81-86 (`!list[id].allowed == true`): not-in guard.
    let existing = load_allowlist(&ctx.data().pool, &gid).await;
    if !allowlist_contains(&existing, user.id.get()) {
        let msg = crate::lang::get(&code, "allowlist_delete_isnt_in").unwrap_or_else(|| {
            "The member you want to remove from the allowlist isn't in it!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ALLOWLIST.list.{}", user.id.get()),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "allowlist_delete_command_work")
            .map(|s| s.replace("${member.user}", &format!("<@{}>", user.id.get())))
            .unwrap_or_else(|| "${member.user} has been removed from the allowlist!".to_string()),
    )
    .await?;
    Ok(())
}

/// List the users in the allowlist!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    description_localized("fr", "Lister les utilisateurs dans la liste autorisée"),
    description_localized("ja", "許可リストのユーザーを一覧表示！"),
    description_localized("ru", "Показать пользователей в белом списке!"),
    description_localized("es-ES", "Listar los usuarios en la lista de permitidos!")
)]
pub async fn allowlist_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS allowlist/!show.ts:48-59: lazy-seed the owner entry on first read.
    let mut rows = load_allowlist(&ctx.data().pool, &gid).await;
    if rows.is_empty() {
        if let Some(owner) = guild_owner_id(&ctx).await {
            // TS seeds the whole ALLOWLIST row
            // (`{enable:false, list:{<owner>:{allowed:true}}}`), not
            // just the list leaf: write the top-level enable:false
            // flag row too (only when absent, never clobbering an
            // existing row).
            if crate::commands::owner::main::tbl_get_value(&ctx.data().pool, &gid, "ALLOWLIST")
                .await
                .is_none()
            {
                let _ = crate::commands::owner::main::routed_set(
                    &ctx.data().pool,
                    &gid,
                    &gid,
                    "ALLOWLIST",
                    &format!("{{\"enable\":false,\"list\":{{\"{owner}\":{{\"allowed\":true}}}}}}"),
                )
                .await;
            }
            let _ = crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                &format!("ALLOWLIST.list.{owner}"),
                r#"{"allowed":true}"#,
            )
            .await;
            rows = load_allowlist(&ctx.data().pool, &gid).await;
        }
    }
    // TS allowlist/!show.ts:65-73: owner or listed members only.
    let author = ctx.author().id.get();
    let owner = guild_owner_id(&ctx).await.unwrap_or(0);
    if !is_guild_owner(author, owner) && !allowlist_contains(&rows, author) {
        let msg = crate::lang::get(&code, "allowlist_show_not_permited").unwrap_or_else(|| {
            "You are not allowed to use this command! You need to be in the allowlist!".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    let title = crate::lang::get(&code, "allowlist_show_embed_author")
        .unwrap_or_else(|| "Allowlist".to_string());
    let embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(serenity::CreateEmbedAuthor::new(title))
        .description(allowlist_mentions(&rows))
        .timestamp(serenity::Timestamp::now());
    // Shared footer + icon attachment, mirroring `footerBuilder` /
    // `footerAttachmentBuilder` (+ `setTimestamp`) in
    // `allowlist/!show.ts:75-93`.
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed =
        crate::commands::shared::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_registers_slash_tree() {
        let cmd = allowlist();
        assert_eq!(cmd.name, "allowlist");
        // Every node in the slash tree carries its own slash action
        // (poise drops nodes without one silently).
        assert!(cmd.slash_action.is_some());
        assert!(cmd.prefix_action.is_some());
        let mut names: Vec<&str> = cmd.subcommands.iter().map(|s| s.name.as_str()).collect();
        names.sort();
        assert_eq!(names, vec!["add", "remove", "show"]);
        for sub in &cmd.subcommands {
            assert!(
                sub.slash_action.is_some(),
                "{} missing slash action",
                sub.name
            );
            assert!(
                sub.prefix_action.is_some(),
                "{} missing prefix action",
                sub.name
            );
        }
    }

    #[test]
    fn allowlist_registers_description_localizations() {
        let cmd = allowlist();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous-groupé pour la catégorie de protection")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("保護カテゴリのサブコマンド！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Подкоманда для категории защиты!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Subcomando para la categoría de protección!")
        );
        let add = cmd.subcommands.iter().find(|s| s.name == "add").unwrap();
        assert_eq!(
            add.description_localizations.get("fr").map(String::as_str),
            Some("Ajouter un utilisateur à la liste blanche")
        );
        let remove = cmd.subcommands.iter().find(|s| s.name == "remove").unwrap();
        assert_eq!(
            remove
                .description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Eliminando un usuario de la lista de permitidos!")
        );
        let show = cmd.subcommands.iter().find(|s| s.name == "show").unwrap();
        assert_eq!(
            show.description_localizations.get("ru").map(String::as_str),
            Some("Показать пользователей в белом списке!")
        );
        // Both member legs expose the required `member` User option.
        for leg in [add, remove] {
            let param = leg
                .parameters
                .iter()
                .find(|p| p.name == "member")
                .unwrap_or_else(|| panic!("{} missing `member` option", leg.name));
            assert!(param.required);
        }
    }
}
