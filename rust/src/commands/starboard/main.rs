use super::*;

use super::{
    starboard_channel::starboard_channel, starboard_config::starboard_config,
    starboard_thread::starboard_thread, starboard_threshold::starboard_threshold,
};

// No parent aliases in TS.
// Mirrors the starboard.ts parent description verbatim.
/// SubCommand group for Starboard category
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "starboard",
    subcommands(
        "starboard_config",
        "starboard_channel",
        "starboard_threshold",
        "starboard_thread"
    ),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn starboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starboard_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = StarboardConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(StarboardConfigAction::On.as_str(), "on");
        assert_eq!(StarboardConfigAction::Off.as_str(), "off");
        assert_eq!(
            StarboardConfigAction::from_name("on"),
            Some(StarboardConfigAction::On)
        );
        assert_eq!(
            StarboardConfigAction::from_name("off"),
            Some(StarboardConfigAction::Off)
        );
        assert_eq!(StarboardConfigAction::from_name("bogus"), None);
        assert_eq!(
            StarboardConfigAction::from_index(1),
            Some(StarboardConfigAction::Off)
        );
        let threads: Vec<_> = StarboardThreadAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(threads, vec!["yes".to_string(), "no".to_string()]);
        assert_eq!(StarboardThreadAction::Yes.as_str(), "yes");
        assert_eq!(StarboardThreadAction::No.as_str(), "no");
        assert_eq!(
            StarboardThreadAction::from_name("yes"),
            Some(StarboardThreadAction::Yes)
        );
        assert_eq!(
            StarboardThreadAction::from_name("no"),
            Some(StarboardThreadAction::No)
        );
        assert_eq!(StarboardThreadAction::from_name("bogus"), None);
        assert_eq!(
            StarboardThreadAction::from_index(0),
            Some(StarboardThreadAction::Yes)
        );
        let list = StarboardConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let threads = StarboardThreadAction::list();
        assert_eq!(
            threads[0].localizations.get("fr").map(String::as_str),
            Some("Créer un fil")
        );
        assert_eq!(
            threads[1].localizations.get("fr").map(String::as_str),
            Some("Ne pas créer un fil")
        );
        assert_eq!(
            StarboardThreadAction::No.localized_name("ja"),
            Some("don_t_create_thread")
        );
    }
}
