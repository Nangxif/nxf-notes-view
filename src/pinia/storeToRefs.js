import { isReactive, isRef, toRaw, toRef } from 'vue';

export function storeToRefs(store) {
  // store是proxy
  store = toRaw(store);
  const refs = {};
  for (let key in store) {
    const value = store[key];
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key);
    }
  }
}
