use super::*;

use super::{
    admin::{allwebhooks, autorenew, derogation, nickkicker, unzip_emojis, wakeup, zip_stickers},
    channels::{slowmode, syncchan},
    info::{inviteinfo, serverpic, whereis},
    roles::{addrolereact, admin_roles, role_members, rolelimit},
    voice::{bringall, talk, untalk, unwlvc, vkick, voicefreeze, voicemove, voiceunfreeze, wlvc},
};

/// Run-less group root. Mirrors the TS `util` command.
// (src/Interaction/HybridCommands/utils/util/util.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "util",
    subcommands(
        "allwebhooks",
        "nickkicker",
        "zip_stickers",
        "vkick",
        "wakeup",
        "derogation",
        "autorenew",
        "admin_roles",
        "slowmode",
        "rolelimit",
        "whereis",
        "serverpic",
        "unzip_emojis",
        "syncchan",
        "addrolereact",
        "inviteinfo",
        "role_members",
        "bringall",
        "talk",
        "untalk",
        "voicefreeze",
        "wlvc",
        "unwlvc",
        "voiceunfreeze",
        "voicemove"
    ),
    subcommand_required
)]
pub async fn util(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
