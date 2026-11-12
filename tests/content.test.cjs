const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/content.js'), 'utf8');
const url = 'https://github.com/user-attachments/assets/4e2f6a0e-5404-416b-96ea-c248eef6d507';

function setup(path) {
  const handlers = {};
  let tick;
  class Textarea {
    constructor() { this.text = ''; this.selectionStart = this.selectionEnd = 0; this.isConnected = true; this.events = []; }
    get value() { return this.text; }
    set value(value) { this.text = value; }
    contains(target) { return target === this; }
    closest() { return null; }
    getClientRects() { return [{}]; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  const editor = new Textarea();
  const other = new Textarea();
  const location = { pathname: path };
  vm.runInNewContext(source, {
    location, HTMLTextAreaElement: Textarea, Event,
    document: { activeElement: other, querySelectorAll: selector => selector === '.cm-content' ? [] : [editor, other],
      addEventListener: (name, fn) => handlers[name] = fn },
    setInterval: callback => { tick = callback; }
  });
  return { editor, other, location, tick: () => tick(),
    drop(files = [{ type: 'video/mp4', name: 'demo.mp4' }]) { handlers.drop({ target: editor, dataTransfer: { files } }); },
    choose() {
      handlers.change({ target: { files: [{ type: 'video/mp4', name: 'demo.mp4' }],
        closest: () => ({ contains: element => element === editor }) } });
    }
  };
}

for (const path of ['/owner/repo/pull/123', '/owner/repo/issues/123', '/owner/repo/discussions/123', '/owner/repo/compare/main...feature', '/owner/repo/edit/main/README.md']) {
  test(`converts an upload in ${path} with multiple editors`, () => {
    const app = setup(path);
    app.editor.value = '# Description\n';
    app.drop();
    app.editor.value += url + '\n';
    app.tick();
    assert.equal(app.editor.value, `# Description\n<video src="${url}"></video>\n`);
    assert.equal(app.other.value, '');
    assert.deepEqual(app.editor.events, ['input', 'change']);
    app.tick();
    assert.equal((app.editor.value.match(/<video/g) || []).length, 1);
  });
}

test('file picker targets its own form even when another editor has focus', () => {
  const app = setup('/owner/repo/pull/123');
  app.choose(); app.editor.value = url; app.tick();
  assert.equal(app.editor.value, `<video src="${url}"></video>`);
});

test('does not convert images or mixed batches', () => {
  for (const files of [[{type:'image/png', name:'photo.png'}], [{type:'video/mp4', name:'demo.mp4'}, {type:'image/png', name:'photo.png'}]]) {
    const app = setup('/owner/repo/pull/123');
    app.drop(files); app.editor.value = url; app.tick();
    assert.equal(app.editor.value, url);
  }
});

test('leaves existing links and tags untouched', () => {
  const app = setup('/owner/repo/pull/123');
  app.editor.value = `${url}\n<video src="${url}"></video>`;
  app.drop(); app.tick();
  assert.equal(app.editor.value, `${url}\n<video src="${url}"></video>`);
});

test('does not follow pending uploads into a different page', () => {
  const app = setup('/owner/repo/pull/123');
  app.drop(); app.location.pathname = '/owner/repo/pull/456';
  app.editor.value = url; app.tick();
  assert.equal(app.editor.value, url);
});

test('does not change non-Markdown source files', () => {
  const app = setup('/owner/repo/edit/main/code.js');
  app.drop(); app.editor.value = url; app.tick();
  assert.equal(app.editor.value, url);
});
