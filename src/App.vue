<script setup>
import HelloWorld from './components/HelloWorld.vue';
import { useCounterStore1 } from './stores/counter1';
import { useCounterStore2 } from './stores/counter2';
import { ref, toRefs } from 'vue';
const store1 = useCounterStore1();
const { increment } = useCounterStore1();
const showHello = ref(true);

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
store1.$onAction(
  (option) => {
    // 这个option总共有以下几个属性
    let { after, onError, args, name, store } = option;
    // after是一个函数，这个函数的参数是一个回调函数，这个回调函数会在
    console.log('数据被action修改之前触发', store.count);
    after(() => {
      console.log('数据被action修改之后触发', store.count);
    });
  },
  false,
  () => {
    console.log('已清除订阅');
  }
);
// const { count, dobule } = store1; // 这种写法没有响应式
// const { count, dobule } = toRefs(store1); //这种写法有响应式
// pinia还提供了一个storeToRefs()
// 我们用pinia解构store的时候不要用toRefs，要用storeToRefs，可以跳过函数的处理
console.log(store1)
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
  <hr color="red" />

  ----------------组件--------------<br />
  <hello-world v-if="showHello" />
  <button @click="showHello = false">关闭hello</button>
</template>

<style scoped></style>
