import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureTemplate = await readFile(new URL('./fixtures/data-workbench-template.html', import.meta.url), 'utf8');
const fixtureUpdateMode = await readFile(new URL('./fixtures/data-workbench-update-mode.html', import.meta.url), 'utf8');
let template = fixtureTemplate.trim(), updateMode = fixtureUpdateMode.trim(), actualSource = null;
try {
  actualSource = await readFile(new URL('../../data-workbench/editor.js', import.meta.url), 'utf8');
  template = actualSource.match(/root\.innerHTML='([^']+)';/)[1];
  updateMode = actualSource.match(/updateMode\.innerHTML='([^']+)';/)[1];
} catch (error) { if (error.code !== 'ENOENT') throw error; }

test('regression structure comes from the actual shared workbench and includes the auto-generation label', () => {
  assert.match(template, /<aside><h2 class="panel-title">尺寸与装配<\/h2><div class="plugin-fields"><\/div>/);
  assert.match(updateMode, /<input type="checkbox" data-auto-generate checked>/);
  if (actualSource) {
    assert.match(actualSource, /updateMode\.className='pgf-update-mode'/);
    assert.match(actualSource, /q\('\.plugin-fields'\)\.before\(updateMode\)/);
  }
});

function sharedStructure({ missingTitle = false } = {}) {
  const initialTitle = template.match(/<aside><h2 class="panel-title">([^<]+)<\/h2><div class="plugin-fields">/)[1];
  const title = { textContent: initialTitle }, checkbox = { checked: true, dataset: { autoGenerate: '' } };
  // Model DOM textContent semantics: assigning text removes the label's input child.
  const label = { children: [checkbox], text: '自动生成',
    set textContent(value) { this.text = value; this.children = []; }, get textContent() { return this.text; } };
  const fields = { previousElementSibling: label }, footer = { textContent: '' };
  const root = { classList: { add() {} }, querySelector(selector) {
    if (selector === '.workspace > aside:last-child > .panel-title') return missingTitle ? null : title;
    if (selector === '.plugin-fields') return fields;
    if (selector === 'footer span:last-child') return footer;
    throw Error('Unexpected selector: ' + selector);
  } };
  return { root, title, label, checkbox };
}
for (const id of ['gustav-visual-prop', 'diesel-locomotive']) {
  const source = await readFile(new URL(`../../${id}/workbench.js`, import.meta.url), 'utf8');
  const mountSource = source.slice(source.indexOf('export function mount')).replace('export function', 'function');
  const marker = { ready: Promise.resolve() };
  const mount = new Function('mountDataWorkbench', 'adapter', 'workerURL', 'presetArtwork', `${mountSource}; return mount;`)(
    () => marker, { id, label: id }, 'test-worker', {});
  test(`${id}: relabels only the inspector heading and preserves the auto-generation input`, () => {
    const dom = sharedStructure(); assert.equal(mount(dom.root), marker);
    assert.equal(dom.title.textContent, '外观与涂装');
    assert.equal(dom.label.children[0], dom.checkbox); assert.equal(dom.checkbox.checked, true);
    assert.equal(dom.label.textContent, '自动生成');
    assert.doesNotMatch(source, /previousElementSibling\.textContent/);
  });
  test(`${id}: a missing title does not crash or alter the auto-generation input`, () => {
    const dom = sharedStructure({ missingTitle: true }); assert.equal(mount(dom.root), marker);
    assert.equal(dom.label.children[0], dom.checkbox);
  });
}
