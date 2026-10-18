/// Derogation store (moderation exemptions). Mirrors !derogation.ts
/// (GUILD.UTILS.DEROGATION[] of user ids).
pub fn derogation_key() -> &'static str {
    "GUILD.UTILS.DEROGATION"
}

pub fn leash_key(follower_id: u64) -> String {
    format!("UTILS.LEASH.{follower_id}")
}
