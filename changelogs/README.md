# iHorizon Changelogs

---

This directory contains the changelogs for current and previous releases of iHorizon, archived for reference and historical tracking.

Releases are managed by two iHorizon team members: 
* Kisakay (@Kisakay)
* Ether (@veryuhq)

## Structure

Changelogs are organized by language (`en` for English, `fr` for French) and then by iHorizon version number.

Each version directory contains one or more of the following files:

* `CHANGELOG_<LANG>_<VERSION>.md` — Markdown version
* `CHANGELOG_<LANG>_<VERSION>.pdf` — PDF version

## Example

```text
en/
└── 2026.6.1/
    └── CHANGELOG_EN_2026.6.1.pdf

fr/
└── 2026.6.1/
    ├── CHANGELOG_FR_2026.6.1.md
    └── CHANGELOG_FR_2026.6.1.pdf
```

## Notes

* Version folders are named after their corresponding iHorizon release.
* Older changelogs are preserved for archival and reference purposes.
* Not all historical versions are available. Changelogs are archived starting from version `2026.1.0`.
* Changelogs may not be available in all supported languages for every release. For example, some older releases may only have a French or English changelog available (like `2026.1.0`). Missing translations will be added progressively as archival work continues.
* The root directory of the iHorizon repository (`ihrz`) also contains a `CHANGELOG.md` file, which always reflects the latest iHorizon release.