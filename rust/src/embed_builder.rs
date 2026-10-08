// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Embed builder state machine. Mirrors utils !embed.ts interactive builder
// (~600 lines: buttons/modals/collectors, live preview, fetch message).
// The Discord UI wiring is pending; the draft model with Discord limits
// is fully ported and unit-tested.

#[derive(Debug, Clone, Default)]
pub struct EmbedField {
    pub name: String,
    pub value: String,
    pub inline: bool,
}

#[derive(Debug, Clone, Default)]
pub struct EmbedDraft {
    pub title: String,
    pub description: String,
    pub color: Option<u32>,
    pub fields: Vec<EmbedField>,
    pub footer: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DraftError {
    TitleTooLong,
    DescriptionTooLong,
    TooManyFields,
    FieldNameTooLong,
    FieldValueTooLong,
    FooterTooLong,
}

pub const MAX_TITLE: usize = 256;
pub const MAX_DESC: usize = 4096;
pub const MAX_FIELDS: usize = 25;
pub const MAX_FIELD_NAME: usize = 256;
pub const MAX_FIELD_VALUE: usize = 1024;
pub const MAX_FOOTER: usize = 2048;

impl EmbedDraft {
    pub fn set_title(&mut self, t: &str) -> Result<(), DraftError> {
        if t.len() > MAX_TITLE {
            return Err(DraftError::TitleTooLong);
        }
        self.title = t.to_string();
        Ok(())
    }

    pub fn set_description(&mut self, d: &str) -> Result<(), DraftError> {
        if d.len() > MAX_DESC {
            return Err(DraftError::DescriptionTooLong);
        }
        self.description = d.to_string();
        Ok(())
    }

    pub fn add_field(&mut self, name: &str, value: &str, inline: bool) -> Result<(), DraftError> {
        if self.fields.len() >= MAX_FIELDS {
            return Err(DraftError::TooManyFields);
        }
        if name.len() > MAX_FIELD_NAME {
            return Err(DraftError::FieldNameTooLong);
        }
        if value.len() > MAX_FIELD_VALUE {
            return Err(DraftError::FieldValueTooLong);
        }
        self.fields.push(EmbedField {
            name: name.to_string(),
            value: value.to_string(),
            inline,
        });
        Ok(())
    }

    pub fn set_footer(&mut self, f: &str) -> Result<(), DraftError> {
        if f.len() > MAX_FOOTER {
            return Err(DraftError::FooterTooLong);
        }
        self.footer = f.to_string();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn limits_mirror_discord() {
        let mut d = EmbedDraft::default();
        assert_eq!(d.set_title(&"x".repeat(257)), Err(DraftError::TitleTooLong));
        assert_eq!(
            d.set_description(&"x".repeat(4097)),
            Err(DraftError::DescriptionTooLong)
        );
        assert_eq!(
            d.set_footer(&"x".repeat(2049)),
            Err(DraftError::FooterTooLong)
        );
        assert_eq!(
            d.add_field(&"n".repeat(257), "v", false),
            Err(DraftError::FieldNameTooLong)
        );
        assert_eq!(
            d.add_field("n", &"v".repeat(1025), false),
            Err(DraftError::FieldValueTooLong)
        );
        for _ in 0..25 {
            d.add_field("n", "v", false).unwrap();
        }
        assert_eq!(d.add_field("n", "v", false), Err(DraftError::TooManyFields));
    }

    #[test]
    fn happy_path() {
        let mut d = EmbedDraft::default();
        d.set_title("hi").unwrap();
        d.set_description("body").unwrap();
        d.add_field("f", "v", true).unwrap();
        assert_eq!(d.fields.len(), 1);
    }
}
