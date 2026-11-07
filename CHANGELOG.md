# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.2] — 2026-11-07

### Changed

- Countdowns of 24 hours or more now use days instead of a long hour count: `63小时`
  becomes `2天15小时`, `47小时` becomes `1天23小时`. Sub-day countdowns keep the
  existing `2小时30分` / `45分` form.

### Tests

- Countdown cases cover the day boundary (`1天`, `1天5分`, `2天`, `2天9小时`,
  `2天15小时`), 36 schedule cases in total.

## [0.1.1] — 2026-10-31

### Fixed

- The client bundle now registers as `@ttxl314/dsh-ds-peak-valley` instead of the old
  unscoped id. The host composes the browser boot graph per package name, so a bundle
  that registers under any other id never satisfies its graph row — the badge silently
  never mounted, without an error in the UI.
- The `link:` dependency, `cordis.patch.yml` row and bundle registration now all use the
  same scoped name, and the profile needs a `dsh plugin install` after a rename.

### Added

- A self-test assertion that `registration.id` equals the `package.json` name, so a future
  rename fails `npm test` instead of failing invisibly at runtime.
- A troubleshooting entry for the rename case, and the registration-id contract in
  "How it works".

### Docs

- Chinese README states the verification target (DSH 0.2.1-rc.5, desktop + web profiles).

## [0.1.0] — 2026-10-29

### Added

- Initial public release: a persistent `文峰` / `文谷` badge in the
  `conversation.composer.dock` slot, beside the session stats line.
- Schedule math computed locally from the browser clock in `Asia/Shanghai`
  (peak: Mon–Fri 09:00–12:00 and 14:00–18:00), with a countdown to the next switch.
- Bilingual README, badge preview, MIT license, and a CI matrix on Node 18/20/22.

[0.1.2]: https://github.com/ttxl314/dsh-ds-peak-valley/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ttxl314/dsh-ds-peak-valley/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ttxl314/dsh-ds-peak-valley/releases/tag/v0.1.0
