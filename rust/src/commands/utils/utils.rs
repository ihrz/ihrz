use super::*;
use super::{
    admin::{
        admin_users, allbots, allwebhooks, autorenew, derogation, dm, embed_post, leash,
        nickkicker, setmentionrole, unban_all, unban_undo, unleash, unzip_emojis, vanity_generator,
        wakeup, zip_emojis, zip_stickers,
    },
    channels::{
        chan_hide, chan_hideall, chan_unhide, chan_unhideall, media_only, renew, slowmode, syncchan,
    },
    info::{
        avatar, banner, emojis, inviteinfo, prevnames, serverinfo, serverpic, snipe, sticker, top,
        userinfo, whereis,
    },
    roles::{
        addrole, addrolereact, admin_roles, delrole, derank, massiverole, nickrole, role_members,
        rolelimit, wlroles, wlroles_add, wlroles_list,
    },
    voice::{
        bringall, massmove, renewvc, talk, untalk, unwlvc, vc_list, vkick, voicefreeze, voicemove,
        voiceunfreeze, wlvc,
    },
};

/// Run-less group root. Mirrors the TS `utils` HybridCommand definition.
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
        "banner",
        "emojis",
        "inviteinfo",
        "prevnames",
        "serverinfo",
        "serverpic",
        "snipe",
        "sticker",
        "top",
        "userinfo",
        "whereis",
        "chan_hide",
        "chan_hideall",
        "chan_unhide",
        "chan_unhideall",
        "media_only",
        "renew",
        "slowmode",
        "syncchan",
        "addrole",
        "addrolereact",
        "admin_roles",
        "delrole",
        "derank",
        "massiverole",
        "nickrole",
        "role_members",
        "rolelimit",
        "wlroles",
        "wlroles_add",
        "wlroles_list",
        "admin_users",
        "allbots",
        "allwebhooks",
        "autorenew",
        "derogation",
        "dm",
        "embed_post",
        "leash",
        "nickkicker",
        "setmentionrole",
        "unban_all",
        "unban_undo",
        "unleash",
        "unzip_emojis",
        "vanity_generator",
        "wakeup",
        "zip_emojis",
        "zip_stickers",
        "bringall",
        "massmove",
        "renewvc",
        "talk",
        "untalk",
        "unwlvc",
        "vc_list",
        "vkick",
        "voicefreeze",
        "voicemove",
        "voiceunfreeze",
        "wlvc"
    ),
    subcommand_required
)]
pub async fn utils(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
