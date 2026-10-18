//! `ReplyUser`: prefix `User` parameter with TS reply-to-user fallback.
//!
//! Mirrors `src/Events/interaction/messageCommandHandler.ts:61-103`
//! (`parseMessageCommand`): when a prefix command message is a reply,
//! TS splices the referenced message author's id into the raw args at
//! the `User`-option index. The observable effect for the overwhelmingly
//! common shape (user option first, no explicit mention given): replying
//! to someone with e.g. `.avatar` / `.ban` targets the replied user.
//!
//! Poise parses prefix `User` params positionally from theraw arg words,
//! so the injection point here is argument parsing itself: when the
//! remaining arg string is empty (no word at all — mirroring TS, where
//! an explicit mention still wins via `parsedUsers` and garbage input
//! still resolves to null) and the invoking message references another
//! message, the referenced author is used. Slash legs delegate straight
//! to `User` (slash replies carry no arg injection in TS).

use poise::serenity_prelude as serenity;

/// A `serenity::User` command parameter with TS reply fallback on prefix.
#[derive(Clone, Debug)]
pub struct ReplyUser(pub serenity::User);

impl ReplyUser {
    /// Unwrap the inner user.
    pub fn into_inner(self) -> serenity::User {
        self.0
    }
    /// Resolve the reply target of `msg`, if any. Cached
    /// `referenced_message` first (no IO), otherwise one HTTP fetch —
    /// the mirror of `messageChannel.messages.fetch(reference.messageId)`.
    pub async fn reply_author(
        ctx: &serenity::Context,
        msg: &serenity::Message,
    ) -> Option<serenity::User> {
        if let Some(boxed) = msg.referenced_message.as_ref() {
            return Some(boxed.author.clone());
        }
        let target = msg.message_reference.as_ref()?.message_id?;
        ctx.http
            .get_message(msg.channel_id, target)
            .await
            .ok()
            .map(|m| m.author)
    }
}

impl std::ops::Deref for ReplyUser {
    type Target = serenity::User;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[poise::async_trait]
impl<'a> poise::PopArgument<'a> for ReplyUser {
    async fn pop_from(
        args: &'a str,
        attachment_index: usize,
        ctx: &serenity::Context,
        msg: &serenity::Message,
    ) -> Result<(&'a str, usize, Self), (Box<dyn std::error::Error + Send + Sync>, Option<String>)>
    {
        // Empty remainder = no word at all: TS would splice the reply
        // author id here (explicit mentions/garbage keep normal parsing).
        if args.trim_start().is_empty() {
            if let Some(author) = Self::reply_author(ctx, msg).await {
                return Ok((args, attachment_index, ReplyUser(author)));
            }
        }
        let (rest, idx, user) =
            poise::pop_prefix_argument!(serenity::User, args, attachment_index, ctx, msg).await?;
        Ok((rest, idx, ReplyUser(user)))
    }
}

#[poise::async_trait]
impl poise::SlashArgument for ReplyUser {
    async fn extract(
        ctx: &serenity::Context,
        interaction: &serenity::CommandInteraction,
        value: &serenity::ResolvedValue<'_>,
    ) -> Result<Self, poise::SlashArgError> {
        let user = poise::extract_slash_argument!(serenity::User, ctx, interaction, value).await?;
        Ok(ReplyUser(user))
    }

    fn create(builder: serenity::CreateCommandOption) -> serenity::CreateCommandOption {
        poise::create_slash_argument!(serenity::User, builder)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reply_user_derefs_to_inner() {
        let v = serde_json::json!({
            "id": "123",
            "username": "reply-target",
            "avatar": null,
            "bot": false
        });
        let u: serenity::User = serde_json::from_value(v).expect("user");
        assert_eq!(ReplyUser(u).id.get(), 123);
    }
}
