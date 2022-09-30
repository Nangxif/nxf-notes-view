<script setup lang="ts">
import { useCounterStore1 } from '../stores/counter1';
const store = useCounterStore1();

store.$onAction(
  (option: any) => {
    // 这个option总共有以下几个属性
    let { after, onError, args, name, store } = option;
    // after是一个函数，这个函数的参数是一个回调函数，这个回调函数会在
    // console.log('helloworld');
    console.log('helloworld里面-数据被action修改之前触发', store.count);
    after(() => {
      console.log('helloworld里面-数据被action修改之后触发', store.count);
    });
  },
  true,
  () => {
    console.log('已清除helloworld订阅');
  }
);
</script>

<template>我是hello</template>
