# Change Log

All notable changes to the "markdown-paste-image" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.3.0] - 2026-10-03

### Changed

- Redesigned the paste panel to follow the VS Code color theme, with inline status and error messages and a collapsible debug log.
- The paste panel now opens beside the editor and stays open on errors so you can retry.
- Images can also be pasted with Ctrl+V / ⌘V in the paste panel.
- Relative `imagePath` values are resolved from the directory of the current Markdown file.
- Refactored the extension into smaller modules and added unit tests.

### Fixed

- The first line of the selected text is now used as the default file name (and alt text).
- Image links containing spaces are wrapped in `<>` so they render correctly.
- Running the command outside a remote environment shows a message instead of "command not found".

## [0.1.0] - 2023-05-08

### Added

- Improved the file name input validation to restrict the use of forbidden characters, including /, \, :, *, ?, ", <, >, |. This prevents potential issues with the file system or operating system
- When a text is selected in the editor, the extension now uses the selected text as the default file name in the input box. The selected text will be replaced by the generated syntax.

## [0.0.4] - 2023-05-07

- Initial release