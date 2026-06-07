# Changelog

All notable changes to AutomataLab are documented in this file.

## v1.0.2

### Fixed
- **Auto-updater now actually works.** Three issues prevented over-the-air updates from functioning:
  - The window lacked the `updater:default` capability, so the app could not call the updater at all.
  - The bundler was not configured to emit signed update artifacts (`createUpdaterArtifacts` was unset), so no `.sig` files or update bundles were produced.
  - The release manifest was published as `latest.json`, while the app's update endpoint expects `updater.json`; the release workflow now mirrors it to the correct name and prefers the NSIS installer for Windows updates.

> **Note:** Because the missing capability is compiled into the binary, builds **v1.0.0** and **v1.0.1** cannot self-update and must be updated to v1.0.2 manually. Auto-updates work from **v1.0.2 onward**.

## v1.0.1

### Added
- **Unsaved-changes prompt on tab close.** Closing a tab with unsaved edits now shows a **Save / Don't Save / Cancel** dialog instead of discarding work silently. Tabs display an unsaved-changes indicator dot.

### Fixed
- The toolbar **Save** action now awaits the file write and clears the unsaved state only on a successful save.

## v1.0.0
- First stable release: DFA / NFA / ε-NFA design and simulation, interactive canvas, multi-tab editing, file save/load, real-time validation, and execution history.
