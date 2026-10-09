use super::*;
use super::{
    delete::authrestore_delete, force_join::authrestore_force_join, get::authrestore_get,
    roles::authrestore_roles, set::authrestore_set,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "authrestore",
    rename = "authrestore",
    subcommands(
        "authrestore_set",
        "authrestore_delete",
        "authrestore_get",
        "authrestore_force_join",
        "authrestore_roles"
    )
)]
pub async fn authrestore(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
