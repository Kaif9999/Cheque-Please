import { describe, expect, it, vi } from 'vitest';
import { createStore } from '@/app/store';

describe('createStore', () => {
  it('merges patches into a new state object', () => {
    const store = createStore({ a: 1, b: 'x' });
    const before = store.get();
    store.set({ a: 2 });
    expect(store.get()).toEqual({ a: 2, b: 'x' });
    expect(store.get()).not.toBe(before);
  });

  it('tells listeners the new and previous state, in subscription order', () => {
    const store = createStore({ n: 0 });
    const order: string[] = [];
    const first = vi.fn(() => order.push('first'));
    store.subscribe(first);
    store.subscribe(() => order.push('second'));
    store.set({ n: 1 });
    expect(first).toHaveBeenCalledWith({ n: 1 }, { n: 0 });
    expect(order).toEqual(['first', 'second']);
  });

  it('stops calling a listener once it unsubscribes', () => {
    const store = createStore({ n: 0 });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.set({ n: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});
