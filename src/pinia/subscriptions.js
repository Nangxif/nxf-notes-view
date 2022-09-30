import { getCurrentInstance, onUnmounted } from 'vue';

export const noop = () => {};

export function addSubscription(
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

  if (!detached && getCurrentInstance()) {
    onUnmounted(removeSubscription);
  }

  return removeSubscription;
}

export function triggerSubscription(subscriptions, ...args) {
  subscriptions.forEach((cb) => cb(...args));
}
