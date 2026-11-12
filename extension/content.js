(() => {
  "use strict";
  // MAIN world is necessary to dispatch through CodeMirror's own editor state.
  const attachment = /https:\/\/(?:github\.com\/user-attachments\/assets\/[\w-]+|github\.com\/[\w.-]+\/[\w.-]+\/assets\/\d+\/[\w-]+|user-images\.githubusercontent\.com\/[^\s<>"')]+)/g;
  let pending = null;

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
    if (!pending) return;
    if (!markdownPage() || location.pathname !== pending.path || !pending.editor.element.isConnected || Date.now() > pending.expires) {
      pending = null;
      return;
    }
    const text = pending.editor.read();
    for (const match of text.matchAll(attachment)) {
      const url = match[0];
      if (pending.before.has(url)) continue;
      // Only a standalone URL is replaced, never an existing tag, Markdown
      // link, image or inline text. GitHub inserts video uploads on their own line.
      const from = text.lastIndexOf("\n", match.index - 1) + 1;
      const nextLine = text.indexOf("\n", match.index);
      const to = nextLine < 0 ? text.length : nextLine;
      if (text.slice(from, to).trim() !== url) continue;
      pending.editor.replace(match.index, match.index + url.length, `<video src="${url.replaceAll("&", "&amp;")}"></video>`);
      pending.before.add(url);
      if (--pending.remaining === 0) pending = null;
      break;
    }
  }, 500);
})();
