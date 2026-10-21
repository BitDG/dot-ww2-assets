/** Correlated calls with a bounded lifetime. No retained promises after disposal. */
export function createWorkerRPC(worker, { onEvent = () => {}, timeoutMs = 60000 } = {}) {
  let sequence = 0, closed = false;
  const pending = new Map();
  const failure = message => Object.assign(new Error(message), { name: 'AbortError' });
  function close(error = failure('Worker disposed')) {
    if (closed) return;
    closed = true;
    worker.terminate();
    for (const job of pending.values()) { clearTimeout(job.timer); job.reject(error); }
    pending.clear();
  }
  worker.addEventListener('message', ({ data }) => {
    if (closed) return;
    if (!data.id) { onEvent(data); return; }
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer); pending.delete(data.id);
    if (data.error) job.reject(Object.assign(new Error(data.error.message), { name: data.error.name ?? 'Error' }));
    else job.resolve(data.result);
  });
  worker.addEventListener('error', event => close(new Error(event.message || 'Worker failed')));
  worker.addEventListener('messageerror', () => close(new Error('Worker message could not be decoded')));
  return {
    call(method, args = [], transfer = []) {
      if (closed) return Promise.reject(failure('Worker disposed'));
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => close(new Error('Worker timeout: ' + method)), timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try { worker.postMessage({ id, method, args }, transfer); }
        catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
      });
    },
    notify(method, args = []) { if (!closed) worker.postMessage({ method, args }); },
    dispose: close,
    get pending() { return pending.size; },
    get closed() { return closed; },
  };
}
