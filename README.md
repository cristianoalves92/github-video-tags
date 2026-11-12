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

After updating the extension, click its reload button in `chrome://extensions`, then reload the GitHub page. Save or copy any unsaved changes first. Version 0.1.1 fixes support for pull request and issue pages. Updating does not convert previous uploads retroactively.

Upload videos separately from images. Mixed batches are skipped to avoid treating images as videos. Existing links and URLs pasted as text are not converted. Upload monitoring expires after ten minutes.

## Limitations and privacy

This is an initial version and still needs validation with a real GitHub upload. It supports textarea fields and accesses the CodeMirror editor through its internal `cmView` reference. This integration may need updating if GitHub changes its editor. New files without a Markdown extension in the URL are not yet supported.

The extension runs only on `github.com`, makes no network requests, stores no data, and requires no clipboard permission. It uses Manifest V3. It does not publish or commit changes for you.

References: [GitHub file attachments](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) and [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
