(() => {
  "use strict";
  // MAIN world is necessary to dispatch through CodeMirror's own editor state.
  const attachment = /https:\/\/(?:github\.com\/user-attachments\/assets\/[\w-]+|github\.com\/[\w.-]+\/[\w.-]+\/assets\/\d+\/[\w-]+|user-images\.githubusercontent\.com\/[^\s<>"')]+)/g;
  let pending = null;
  const checked = new WeakMap();

  function markdownPage() {
    const path = decodeURIComponent(location.pathname);
    return /^\/[^/]+\/[^/]+\/(?:pull|pulls|issues|discussions|compare)(?:\/|$)/.test(path) ||
      (/\/(?:edit|new)\//.test(path) && /\.(?:md|markdown)$/i.test(path));
  }

  function editors() {
    const result = [];
    for (const element of document.querySelectorAll(".cm-content")) {
      const view = element.cmView?.view ?? element.cmView?.rootView?.view;
      if (view?.state?.doc && typeof view.dispatch === "function") {
        result.push({ element, read: () => view.state.doc.toString(),
          replace: (from, to, insert) => view.dispatch({ changes: { from, to, insert } }) });
      }
    }
    for (const element of document.querySelectorAll('textarea:not([readonly]):not([disabled])')) {
      if (!element.getClientRects().length || element.closest(".cm-editor")) continue;
      result.push({ element, read: () => element.value, replace(from, to, insert) {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const map = position => position <= from ? position : position >= to ? position + insert.length - (to - from) : from + insert.length;
        const next = element.value.slice(0, from) + insert + element.value.slice(to);
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(element, next);
        element.setSelectionRange(map(start), map(end));
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } });
    }
    return result;
  }

  function comparison(text) {
    const lines = text.split("\n");
    const offsets = [];
    let offset = 0;
    let fence = null;
    const protectedLines = new Set();
    for (let i = 0; i < lines.length; i++) {
      offsets.push(offset);
      offset += lines[i].length + 1;
      const marker = lines[i].match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        protectedLines.add(i);
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length &&
            lines[i].slice(marker[0].length).trim() === "") fence = null;
      } else if (marker) {
        fence = marker[1];
        protectedLines.add(i);
      } else if (/^(?: {4}|\t)/.test(lines[i])) protectedLines.add(i);
    }
    function read(start, label) {
      if (protectedLines.has(start)) return null;
      const match = lines[start]?.match(new RegExp("^ {0,3}" + label + "![ \t]*(.*)$"));
      if (!match) return null;
      let end = start;
      let media = match[1].trim();
      while (!media && end + 1 < lines.length && !protectedLines.has(end + 1)) media = lines[++end].trim();
      // GitHub may emit HTML media over multiple lines.
      if (/^<(?:video|img)\b/i.test(media)) {
        while (!/^(?:<video\b[^>]*>[\s\S]*<\/video>|<img\b[^>]*>)$/i.test(media) &&
               end + 1 < lines.length && !protectedLines.has(end + 1) &&
               !/^\s*(?:Before|After)!/.test(lines[end + 1])) {
          media += " " + lines[++end].trim();
        }
      }
      const html = /^(?:<video\b[^>]*>\s*<\/video>|<img\b[^>]*>)$/i.test(media) && /\bsrc\s*=\s*["'][^"']+["']/i.test(media);
      const image = /^!\[(?:\\.|[^\]\\])*\]\(https?:\/\/[^\s]+(?:[ \t]+"[^"\n]*")?\)$/.test(media);
      if (!html && !image) return null;
      return { end, media: media.replace(/(?<!\\)\|/g, "\\|") };
    }
    for (let i = 0; i < lines.length; i++) {
      const before = read(i, "Before");
      if (!before) continue;
      let afterLine = before.end + 1;
      while (afterLine < lines.length && !lines[afterLine].trim()) afterLine++;
      const after = read(afterLine, "After");
      if (!after) continue;
      const prefix = i > 0 && lines[i - 1].trim() ? "\n" : "";
      const suffix = after.end + 1 < lines.length && lines[after.end + 1].trim() ? "\n" : "";
      return { from: offsets[i], to: offsets[after.end] + lines[after.end].length,
        insert: prefix + "| Before | After |\n| --- | --- |\n| " + before.media + " | " + after.media + " |" + suffix };
    }
    return null;
  }

  function convertComparisons() {
    if (!markdownPage()) return;
    for (const editor of editors()) {
      const text = editor.read();
      if (checked.get(editor.element) === text) continue;
      checked.set(editor.element, text);
      const change = comparison(text);
      if (change) editor.replace(change.from, change.to, change.insert);
    }
  }

  function arm(event) {
    if (!markdownPage()) return;
    const files = Array.from(event.dataTransfer?.files ?? event.clipboardData?.files ?? event.target?.files ?? []);
    // Mixed batches are deliberately skipped: opaque attachment URLs do not
    // identify which file is the video and uploads may finish out of order.
    if (!files.length || !files.every(file => file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name))) return;
    const available = editors();
    const uploadContainer = event.target?.closest?.("file-attachment, .js-comment-field, .js-write-bucket, form");
    const nearby = uploadContainer ? available.filter(item => uploadContainer.contains(item.element)) : [];
    const editor = available.find(item => item.element.contains(event.target)) ??
      (nearby.length === 1 ? nearby[0] : null) ??
      available.find(item => item.element.contains(document.activeElement)) ??
      (available.length === 1 ? available[0] : null);
    if (!editor) return;
    pending = { editor, before: new Set(editor.read().match(attachment) ?? []),
      remaining: files.length, path: location.pathname, expires: Date.now() + 10 * 60 * 1000 };
  }

  for (const type of ["drop", "paste", "change"]) document.addEventListener(type, arm, true);

  setInterval(() => {
    convertComparisons();
    if (!pending) return;
    if (!markdownPage() || location.pathname !== pending.path || !pending.editor.element.isConnected || Date.now() > pending.expires) {
      pending = null;
      return;
    }
    const text = pending.editor.read();
    for (const match of text.matchAll(attachment)) {
      const url = match[0];
      if (pending.before.has(url)) continue;
      // Accept a standalone URL or one prefixed by a comparison marker,
      // never an existing tag, Markdown link, image or arbitrary inline text.
      const from = text.lastIndexOf("\n", match.index - 1) + 1;
      const nextLine = text.indexOf("\n", match.index);
      const to = nextLine < 0 ? text.length : nextLine;
      if (text.slice(from, to).trim().replace(/^(?:Before|After)![ \t]*/, "") !== url) continue;
      pending.editor.replace(match.index, match.index + url.length, `<video src="${url.replaceAll("&", "&amp;")}"></video>`);
      pending.before.add(url);
      if (--pending.remaining === 0) pending = null;
      break;
    }
  }, 500);
})();
