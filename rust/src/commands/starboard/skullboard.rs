use super::*;

use super::{
    skull_channel::skull_channel, skull_config::skull_config, skull_thread::skull_thread,
    skull_threshold::skull_threshold,
};

/// Skullboard parent command. Mirrors skullboard.ts (no parent aliases in TS).
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn skullboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skullboard_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SkullConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(SkullConfigAction::On.as_str(), "on");
        assert_eq!(SkullConfigAction::Off.as_str(), "off");
        assert_eq!(
            SkullConfigAction::from_name("on"),
            Some(SkullConfigAction::On)
        );
        assert_eq!(SkullConfigAction::from_name("bogus"), None);
        assert_eq!(
            SkullConfigAction::from_index(1),
            Some(SkullConfigAction::Off)
        );
        let threads: Vec<_> = SkullThreadAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(threads, vec!["yes".to_string(), "no".to_string()]);
        assert_eq!(SkullThreadAction::Yes.as_str(), "yes");
        assert_eq!(SkullThreadAction::No.as_str(), "no");
        assert_eq!(
            SkullThreadAction::from_name("no"),
            Some(SkullThreadAction::No)
        );
        assert_eq!(
            SkullThreadAction::from_name("yes"),
            Some(SkullThreadAction::Yes)
        );
        assert_eq!(
            SkullThreadAction::from_index(0),
            Some(SkullThreadAction::Yes)
        );
        let list = SkullConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let threads = SkullThreadAction::list();
        assert_eq!(
            threads[1].localizations.get("fr").map(String::as_str),
            Some("Ne pas créer un fil")
        );
        assert_eq!(
            SkullThreadAction::Yes.localized_name("ru"),
            Some("create_thread")
        );
    }
}
