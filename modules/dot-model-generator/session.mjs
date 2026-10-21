import { canMount, getModel } from './catalog.mjs';
import { copyJSON, readNativeRecipe, readWorkspaceRecipe } from './recipes.mjs';

const canceled = () => new DOMException('模型切换已取消', 'AbortError');
function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(canceled());
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Own exactly one child workbench. No renderer, Worker or frame loop is allocated here. */
export function createModelSession({ initial, load, mount, onState = () => {}, onMounted = () => {}, onRelease = () => {} }) {
  let state = readWorkspaceRecipe(initial), disposed = false, active = true, sequence = 0;
  let current = null, transition = Promise.resolve(), requestAbort = null, phase = 'idle', error = null;
  let resolveReady, rejectReady, readySettled = false;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});
  const pendingRetirements = new Set();
  const valid = ticket => !disposed && ticket === sequence;
  const report = () => onState({ assetId: state.assetId, requestedAssetId, phase, error, active, disposed });
  let requestedAssetId = state.assetId;

  function settleReady(failure) {
    if (readySettled) return;
    readySettled = true;
    failure ? rejectReady(failure) : resolveReady();
  }
  function release(record, remember = true) {
    if (!record || record.retirement) return record?.retirement ?? Promise.resolve();
    // Invalidate current before observers or callbacks can re-enter the session.
    if (current === record) current = null;
    // A broken child pause hook must not prevent its dispose hook from running.
    try { record.editor.setActive(false); }
    catch (failure) { record.pauseError = failure.message; }
    let snapshot;
    try { if (remember && record.completed) snapshot = record.editor.snapshot(); }
    catch (failure) { record.snapshotError = failure.message; }
    record.retirement = Promise.resolve(snapshot).then(value => {
      if (value !== undefined) state.models[record.assetId] = readNativeRecipe(record.assetId, value);
    }).catch(failure => { record.snapshotError = failure.message; }).finally(() => {
      try { record.editor.dispose(); } finally { onRelease(record); }
    });
    pendingRetirements.add(record.retirement);
    record.retirement.finally(() => pendingRetirements.delete(record.retirement)).catch(() => {});
    return record.retirement;
  }
  function select(assetId, { recipe, workspace } = {}) {
    if (disposed) return Promise.reject(canceled());
    const model = getModel(assetId);
    const replacement = recipe === undefined ? undefined : readNativeRecipe(assetId, recipe);
    const replacementWorkspace = workspace === undefined ? undefined : readWorkspaceRecipe(workspace);
    const ticket = ++sequence;
    requestAbort?.abort();
    const controller = requestAbort = new AbortController();
    requestedAssetId = assetId; phase = 'loading'; error = null;
    // Freeze old work now, including its in-flight export, while an async snapshot retires.
    const retiring = release(current);
    report();
    const run = async () => {
      await retiring;
      if (!valid(ticket)) return false;
      if (replacementWorkspace) state = replacementWorkspace;
      if (replacement !== undefined) state.models[assetId] = replacement;
      if (!canMount(model)) {
        state.assetId = assetId; phase = 'source-only'; report();
        // This is an explicit unavailable catalog view, not a generated asset.
        settleReady(); return true;
      }
      let record;
      try {
        const loaded = await load(model, { signal: controller.signal });
        if (!valid(ticket)) return false;
        // Serialized transitions prevent concurrent async mounts from owning renderers.
        const editor = await mount(model, loaded, state.models[assetId] && copyJSON(state.models[assetId]), { signal: controller.signal });
        record = { assetId, editor, completed: false, retirement: null };
        if (!valid(ticket)) { await release(record, false); return false; }
        current = record;
        editor.setActive(active);
        onMounted(record, model);
        await abortable(editor.ready, controller.signal);
        if (!valid(ticket)) { await release(record, false); return false; }
        record.completed = true;
        // Reject an incorrectly wired backend before its recipe enters this model's slot.
        const snapshot = await editor.snapshot();
        if (!valid(ticket)) { await release(record); return false; }
        state.models[assetId] = readNativeRecipe(assetId, snapshot);
        state.assetId = assetId; phase = 'ready'; report(); settleReady(); return true;
      } catch (failure) {
        await release(record, false);
        if (!valid(ticket) || failure.name === 'AbortError') return false;
        error = failure.message; phase = 'error'; report(); settleReady(failure); throw failure;
      }
    };
    transition = transition.catch(() => {}).then(run);
    return transition;
  }
  async function snapshot() {
    const record = current;
    if (record?.completed && !record.retirement) {
      const value = await record.editor.snapshot();
      if (record === current && !record.retirement) state.models[record.assetId] = readNativeRecipe(record.assetId, value);
    }
    await Promise.all([...pendingRetirements]);
    return readWorkspaceRecipe(state);
  }
  function setActive(value) {
    if (disposed) return;
    active = !!value; current?.editor.setActive(active); report();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; phase = 'disposed'; sequence++; requestAbort?.abort();
    settleReady(canceled()); void release(current, false); report();
  }
  return {
    ready, select, snapshot, setActive, dispose, whenIdle: () => transition,
    restore(value) { const next = readWorkspaceRecipe(value); return select(next.assetId, { workspace: next }); },
    current: () => current?.editor ?? null,
    diagnostics: () => ({ phase, assetId: state.assetId, requestedAssetId, active, disposed,
      switching: phase === 'loading', pendingRetirements: pendingRetirements.size,
      ownedWorkbenches: (current ? 1 : 0) + pendingRetirements.size,
      child: current?.editor.diagnostics() ?? null, error }),
  };
}
