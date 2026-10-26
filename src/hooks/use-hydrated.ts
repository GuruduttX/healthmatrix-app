import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while a web page is rendered on the server and while the browser hydrates it, true from
 * the next render on. Always true on phones, which have no server render. React reads the server
 * value during hydration, so both sides render the same thing first.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
