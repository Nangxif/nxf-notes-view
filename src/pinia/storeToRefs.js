import { isReactive, isRef, toRaw, toRef } from 'vue';

export function storeToRefs(store) {
  // store是proxy，里面会有store的自定义方法和属性，但是这些属性我们是不需要解构的，我们需要解构的是我们自己定义的state，getter
  // 因此我们才会在遍历store属性的时候判断是否为ref或者是否为reactive
  store = toRaw(store);
  const refs = {};
  for (let key in store) {
    const value = store[key];
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key);
    }
  }
}
