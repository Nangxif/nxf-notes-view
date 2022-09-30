<script setup>
import { useCounterStore1 } from './stores/counter1';
import { toRefs } from 'vue';
import { useCounterStore2 } from './stores/counter2';
const store1 = useCounterStore1();
const { increment } = useCounterStore1();
const handleClick1 = () => {
  increment(3);
};
const handleReset1 = () => {
  store1.$reset();
};

const handleDispose = () => {
  store1.$dispose();
};

const store2 = useCounterStore2();

const handleClick2 = () => {
  store2.increment(3);
};
// 此方法是发布订阅
store2.$onAction(function ({ after, onError }) {
  // 方法
  console.log('action running', store2.count);
  after(() => {
    console.log('action after', store2.count);
  });
  onError((err) => {
    console.log('error', err);
  });
});
console.log(store1)
// const { count, dobule } = store1; // 这种写法没有响应式
// const { count, dobule } = toRefs(store1); //这种写法有响应式
// pinia还提供了一个storeToRefs()
// 我们用pinia解构store的时候不要用toRefs，要用storeToRefs，可以跳过函数的处理
// const { count, dobule } = storeToRefs(store1); //这种写法有响应式
// 为什么有这个鸡肋的方法
</script>

<template>
  ----------------options-------------- <br />
  {{ store1.count }} /
  {{ store1.double }}
  <button @click="handleClick1">修改状态</button>
  <button @click="handleReset1">重置状态</button>
  <button @click="handleDispose">卸载响应式</button>
  <hr color="red" />

  ----------------setup--------------<br />
  {{ store2.count }}
  {{ store2.double }}

  <button @click="handleClick2">修改状态</button>
</template>

<style scoped></style>

https://pinia.vuejs.org/
