use super::*;
use super::{
    admin::{
        admin_users, allbots, dm, embed_post, leash, setmentionrole, unleash, vanity_generator,
        zip_emojis,
    },
    channels::{media_only, renew},
    info::{avatar, emojis, prevnames, serverinfo, snipe, sticker, top, userinfo},
    roles::{addrole, delrole, derank, massiverole, nickrole, wlroles, wlroles_add, wlroles_list},
    voice::{massmove, vc_list},
};

/// Run-less group root. Mirrors the TS `utils` command.
// (src/Interaction/HybridCommands/utils/utils.ts, exactly 25 subcommands).
// A bare invocation raises SubcommandRequired (mapped to help in
// `bot.rs`) before this body runs, on both paths.
// Prefix choice exactness (accepted): `ChoiceParameter` leaves
// (`slowmode`'s `DurationChoice`: `0`, `5s`..`6h`) match the choice key
// exactly on the prefix path — `!utils cooldown 5` parses but matches
// no choice, unlike the TS prefix leg which folded through
// `timeConversion`. Slash users get the picker, so this only affects
// prefix discoverability.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "utils",
    subcommands(
        "avatar",
        "vc_list",
        "vanity_generator",
        "userinfo",
        "snipe",
        "leash",
        "unleash",
        "dm",
        "wlroles",
        "media_only",
        "setmentionrole",
        "renew",
        "prevnames",
        "nickrole",
        "massmove",
        "massiverole",
        "serverinfo",
        "emojis",
        "embed_post",
        "derank",
        "admin_users",
        "allbots",
        "addrole",
        "delrole",
        "zip_emojis",
        // Prefix-only message-command ports (no slash leg, so they do
        // not count toward Discord's 25 slash options).
        "sticker",
        "top",
        // Rust-only splits of the TS `wlroles` subcommand (prefix-only
        // helpers; TS has no such slash subs).
        "wlroles_add",
        "wlroles_list"
    ),
    subcommand_required,
    description_localized("fr", "Commande sous groupé pour la catégorie utilitaire"),
    description_localized("ja", "ユーティリティコマンドのサブコマンドカテゴリ"),
    description_localized("ru", "Категория подкоманд для утилит"),
    description_localized("es-ES", "Categoría de subcomando para comandos de utilidad"),
)]
pub async fn utils(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
