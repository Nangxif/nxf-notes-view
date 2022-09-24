<script setup>
import { ref } from 'vue';
import { useCounterStore } from './stores/counter';
import HelloWorld from './components/HelloWorld.vue';
const showHello = ref(true);
const store = useCounterStore();
console.log(store);
// $onAction的本体是pinia源码里面的addSubscription，这个函数接收四个参数，
// 参数1是subscriptions，这是pinia在createSetupStore里面定义的一个数组，用来存放订阅的回调函数
// 参数2是一个订阅的回调，也就是传给$onAction的第一个参数，这个回调的参数是一个option，这个option可以解构出
//   - after: 一个函数，可以接收一个回调，这个回调在action修改数据后触发
//   - onError: 一个函数，可以接收一个回调，这个回调在action修改数据时如果有错误就触发
//   - args: 一个数组，表示传给action的payload
//   - name： 当前store的id
//   - store: 当前的store
//  参数3是一个detached布尔值，也就是传给$onAction的第二个参数，这个参数表示组件卸载的时候是否保留这个订阅
//  参数4是一个函数，也就是传给$onAction的第三个参数，这个参数虽然在ts类型声明里面是没有的，但是是可以使用的，在detached为false，并且组件卸载的时候会触发
store.$onAction(
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
store.$state;
// // store.$dispose();
// console.log(store)
// store.$patch(($store) => {
//   console.log($store);
// });
// store.$subscribe((obj, store) => {
//   console.log(obj, store);
// });
</script>

<template>
  {{ store.count }}
  {{ store.dobule }}
  // 如果我要修改状态，有下面几种方式 // 第一种比较暴力
  <button @click="() => store.count++">修改状态</button>
  // 第二种用action
  <button @click="store.increment(3)">修改状态</button>
  <button @click="store.$reset()">重置</button>
  <hello-world v-if="showHello" />
  <button @click="showHello = false">关闭hello</button>
</template>
