export type Listener<T> = (state: Readonly<T>, prev: Readonly<T>) => void;

export interface Store<T> {
  get(): Readonly<T>;
  /** Merges `patch` in and tells every listener, which can compare `state` with `prev` to skip work. */
  set(patch: Partial<T>): void;
  /** Listeners run in the order they subscribed. Returns an unsubscribe function. */
  subscribe(listener: Listener<T>): () => void;
}

/** A minimal observable store: one object of state, replaced on every change. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state: Readonly<T> = { ...initial };
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      for (const listener of listeners) listener(state, prev);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
