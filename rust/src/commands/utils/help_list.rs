/// Help: dynamic command list grouped by category.
/// Mirrors bot help.ts (all-commands select menu, flattened to pages).
pub fn help_page(commands: &[(String, Option<String>)], page: usize, per_page: usize) -> String {
    let mut sorted = commands.to_vec();
    sorted.sort();
    let slice = crate::executor::paginate(&sorted, page, per_page);
    slice
        .iter()
        .map(|(name, cat)| {
            format!(
                "/{} ({})",
                name,
                cat.clone().unwrap_or_else(|| "?".to_string())
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn help_pages_cover_all() {
        let all = vec![
            ("b".to_string(), Some("x".to_string())),
            ("a".to_string(), None),
            ("c".to_string(), Some("y".to_string())),
        ];
        let p1 = help_page(&all, 1, 2);
        assert!(p1.contains("/a (?)"));
        assert!(p1.contains("/b (x)"));
        assert!(!p1.contains("/c"));
        assert_eq!(crate::executor::total_pages(all.len(), 2), 2);
    }
}
