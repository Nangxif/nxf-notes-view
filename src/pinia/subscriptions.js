import { getCurrentInstance, onUnmounted } from 'vue';

export const noop = () => {};

export function addSubscription(
  // 这个数组是pinia内部定义的，里面存放的是第二个参数callback
  subscriptions,
  callback,
  detached,
  onCleanup = noop
) {
  subscriptions.push(callback);

  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback);
    if (idx > -1) {
      subscriptions.splice(idx, 1);
      onCleanup();
    }
  };
  // 如果$onAction的第二个参数是true，那么在组件卸载的时候，$onAction订阅的回调还会被触发
  if (!detached && getCurrentInstance()) {
    onUnmounted(removeSubscription);
  }

  return removeSubscription;
}

export function triggerSubscription(subscriptions, ...args) {
  subscriptions.forEach((cb) => cb(...args));
}
