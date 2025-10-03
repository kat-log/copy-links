# Copy Qiita links in tables

This is a minimal Chrome extension (Manifest V3).

What it does

- When you click the extension toolbar icon, it finds all <table> elements on the current page, extracts all links whose href starts with `https://qiita.com`, joins them with newlines (one link per line), and copies the resulting text to the clipboard.

Do newlines work in the clipboard?

- Yes. Clipboard text can contain newlines. When you paste into editors or textarea fields, the newline characters will be preserved.

How to load locally

1. Open Chrome and go to chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder (`copy-qiita-ranking`)
4. Visit a page with tables containing Qiita links and click the extension icon.

Notes

- If clipboard write fails due to site security/policy, the extension will show a prompt with the text so you can copy manually.
- This extension uses the page's clipboard API (so the page origin must allow it). It runs the script directly in the page context.
