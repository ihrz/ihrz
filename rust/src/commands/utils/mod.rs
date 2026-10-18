// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/bot/* + utils/* (sample).

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

pub use super::shared::{embed_with_footer, footer_parts};

pub mod admin;
pub mod admin_roles_pager;
pub mod channel;
pub mod channels;
pub mod git_lines;
pub mod help_list;
pub mod info;
pub mod legacy_handlers;
pub mod moderation_keys;
pub mod nick_kicker;
pub mod roles;
pub mod server_stats;
pub mod steal;
pub mod unbanall;
pub mod unslowmode;
pub mod user_banner;
pub mod util;
#[allow(clippy::module_inception)]
pub mod utils;
pub mod utilss;
pub mod vanity;
pub mod voice;

pub use self::admin_roles_pager::*;
pub use self::git_lines::*;
#[allow(unused_imports)] // kept so `utils::help_page` stays addressable
pub use self::help_list::*;
pub use self::moderation_keys::*;
pub use self::nick_kicker::*;
pub(crate) use self::server_stats::stat_emoji;
pub use self::server_stats::*;
pub use self::steal::*;
pub use self::user_banner::*;
pub use self::vanity::*;

#[cfg(test)]
mod localization_tests {

    type LocCmd = poise::Command<crate::commands::Data, crate::commands::Error>;

    fn find_path<'a>(cmds: &'a [LocCmd], path: &[&str]) -> &'a LocCmd {
        let cmd = cmds
            .iter()
            .find(|c| c.name == path[0])
            .unwrap_or_else(|| panic!("command {} missing", path.join(" ")));
        if path.len() == 1 {
            cmd
        } else {
            find_path(&cmd.subcommands, &path[1..])
        }
    }

    #[test]
    fn loc_channel() {
        // TS utils/chanel/channel.ts (`channel`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["channel"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commandes d'opérations pour salons")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("チャンネル操作コマンド")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("channel")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("channel")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
    }

    #[test]
    fn loc_unban_all() {
        // TS utils/unbanall/unbanall.ts (`unban-all`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["unban-all"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Action de masse pour débannir")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("一斉バン解除アクション")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("unbanall")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("unban-all")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
    }

    #[test]
    fn loc_util() {
        // TS utils/util/util.ts (`util`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["util"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous groupé pour la catégorie utilitaire")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ユーティリティコマンドのサブコマンドカテゴリ")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_utils() {
        // TS utils/utils.ts (`utils`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["utils"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous groupé pour la catégorie utilitaire")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ユーティリティコマンドのサブコマンドカテゴリ")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_utilss() {
        // TS utils/utilss/utilss.ts (`utilss`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["utilss"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous groupé pour la catégorie utilitaire")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ユーティリティコマンドのサブコマンドカテゴリ")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_banner() {
        // TS utils/banner/banner.ts (`banner`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["banner"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Récuperer la bannière des éléments spécifiés (serveur/utilisateur)")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("指定されたもののバナーを取得（サーバー/ユーザー）")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_dm() {
        // TS utils/utils.ts (`dm`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["utils", "dm"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Envoyer un message privée à un utilisateur")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ユーザー1にプライベートメッセージを送信")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("mp")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("dm")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "private")
            .expect("param private");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("l'autheur est-t'il anonyme ?")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("非公開ですか？")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "message")
            .expect("param message");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("le message")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("プライベートメッセージ")
        );
    }
}
