## [Unreleased]

### Added

- Lightweight syntax highlighting for tsx and css in docs

- Getting started, API, keyboard/natural-language, and styling documentation pages
- Five live styling examples with editable css
- Playwright tests for actual layout, interaction, and docs
- CSS maintenance notes and a release checklist; non-mutating checks and browser coverage in CI
- Reduced-motion support

### Changed

- Separated internal date/segment rules and icons from the component, consolidated segment completion and keyboard navigation, and shared reactive hour-format resolution across editing and accessibility.
- **Breaking:** Parent-driven controlled resets and replacements now discard stale segments and unfinished typing, while accepted change callbacks preserve incremental entry.

### Fixed

- Segmented spinbuttons expose numeric values, localized value text, calendar ranges, readonly state, and validation descriptions to assistive technology; removed unsupported selection/group ARIA states.
- Native picker events respect readonly/disabled state and avoid duplicate notifications for accepted input/change pairs.
- Prevent Ctrl/Cmd/Alt keyboard shortcuts from accidentally editing the date.
- Fix #1, natural-language rows collapsing when the preview is empty, and inconsistent native input height with custom line-height.
- Accessible labels forwarded to the editor group and an explicit name for natural-language input.
- Readonly state applied to an already-open natural-language input.
- Missing native `showPicker` support no longer throws on invocation.
- Documentation production builds now use Vite’s production environment flags.
- Removed stale demo CSS hooks and made the playground resize handle keyboard-operable.

## [0.1.8] - 2026-09-22

- Fix #2, clear all segments easily by multiple backspace or by deleting when all segments selected

## [0.1.7] - 2026-06-26

### Fixed

- Fix #3, a regression where controlled fields would not maintain typed values on transition from null

## [0.1.6] - 2026-06-26

### Fixed

- Controlled value transtion from null to valid date not working
- Passing string to style prop doesn't work. Now typescript forces object style.

## [0.1.5] - 2026-06-26

### Added

- Links to npm in readme and demo site

### Fixed

- Fix `style` not being passed through from props

## [0.1.4] - 2026-06-26

### Added

- Changelog
- Social media metadata for demo site (Open Graph and Twitter cards)

### Fixed

- Fix parent sometimes getting scrollbars unnecessarily
- Fix ghost text alignment when custom line-height is 1

## [0.1.3] - 2026-06-25

### Fixed

- Github workflows for testing and publishing
- Flaky ref syntax on action buttons

## [0.1.0] - 2026-06-24

Initial release
