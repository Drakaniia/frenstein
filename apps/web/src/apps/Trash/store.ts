import { useSyncExternalStore } from 'react';

import { CONTENT } from '@/data/content';
import { readJson, STORAGE_KEYS, writeJson } from '@/os/persistence';

export interface TrashItem {
  id: string;
  name: string;
  from: string;
  deleted: string;
  kind: string;
  size: string;
}

function load(): TrashItem[] {
  const raw = readJson<unknown | null>(STORAGE_KEYS.trash, null);
  if (!Array.isArray(raw)) return CONTENT.trashItems.map((item) => ({ ...item }));
  return raw.filter(
    (item): item is TrashItem =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as TrashItem).id === 'string' &&
      typeof (item as TrashItem).name === 'string'
  ).map((item) => ({
    id: item.id,
    name: item.name,
    from: typeof item.from === 'string' ? item.from : 'C:\\',
    deleted: typeof item.deleted === 'string' ? item.deleted : '',
    kind: typeof item.kind === 'string' ? item.kind : 'File',
    size: typeof item.size === 'string' ? item.size : '',
  }));
}

let items: TrashItem[] | null = null;
const listeners = new Set<() => void>();

function current(): TrashItem[] {
  if (!items) items = load();
  return items;
}

/** The Recycle Bin's contents, shared by the bin window and its desktop icon. */
export const trashStore = {
  get: current,
  set(next: TrashItem[]): void {
    items = next;
    writeJson(STORAGE_KEYS.trash, next);
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useTrash(): TrashItem[] {
  return useSyncExternalStore(trashStore.subscribe, current, current);
}

/** Items that refuse to be restored (the point of the joke). */
export const UNRESTORABLE = new Set<string>(CONTENT.trashItems.map((item) => item.id));
