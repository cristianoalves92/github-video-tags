# GitHub Video Tags

A Chrome extension that automatically wraps uploaded video URLs in HTML video tags when editing `.md` or `.markdown` files, pull request descriptions and comments, issues, and discussions on GitHub:

```html
<video src="https://github.com/user-attachments/assets/…"></video>
```

## Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project's `extension` folder.
5. Reload your GitHub tab.

## Usage

Open a README in edit mode, or edit a pull request or issue description or comment. Upload a video by dragging and dropping it, pasting a file, or choosing a file. Keep the editor open during the upload. When GitHub inserts the URL on its own line, the extension automatically wraps it in a video tag. Review the result and save as usual.

After updating the extension, click its reload button in `chrome://extensions`, then reload the GitHub page. Save or copy any unsaved changes first. Updating does not wrap previous video uploads retroactively.

Upload videos separately from images. Mixed batches are skipped to avoid treating images as videos. Existing links and URLs pasted as text are not converted. Upload monitoring expires after ten minutes.

### Before / After tables

Version 0.2.0 adds automatic comparison tables. Put `Before!` and `After!` at the start of consecutive lines, followed by a video or image:

```html
Before! <video src="https://example.com/before.mp4"></video>
After! <video src="https://example.com/after.mp4"></video>
```

The extension replaces the pair with:

```markdown
| Before | After |
| --- | --- |
| <video src="https://example.com/before.mp4"></video> | <video src="https://example.com/after.mp4"></video> |
```

Images work too, using Markdown image syntax or HTML `<img>` tags:

```markdown
Before! ![Before screenshot](https://example.com/before.png)
After! ![After screenshot](https://example.com/after.png)
```

You can mix a video and an image in a comparison. Each marker must use the exact capitalization shown. Media can be on the same line as its marker or on the next non-empty line, and blank lines between the two entries are allowed. The extension waits for both complete media elements before creating the table. Fenced and indented code blocks are left unchanged.

For new uploads, type `Before!`, upload the first file and wait for it to finish, then repeat with `After!`. Video URLs from uploads tracked by the extension are wrapped automatically even when preceded by a marker. Existing complete video tags and image markup also work; bare URLs pasted as text do not identify the media type and are left unchanged.

## Tests

Run `node --test tests/content.test.cjs` with Node.js. No dependencies are required.

## Limitations and privacy

This is an initial version and still needs validation with a real GitHub upload. It supports textarea fields and accesses the CodeMirror editor through its internal `cmView` reference. This integration may need updating if GitHub changes its editor. New files without a Markdown extension in the URL are not yet supported.

The extension runs only on `github.com`, makes no network requests, stores no data, and requires no clipboard permission. It uses Manifest V3. It does not publish or commit changes for you.

References: [GitHub file attachments](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) and [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
