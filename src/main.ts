import { createApp } from 'vue';
import App from './App.vue';

import { createPinia } from '@/pinia';

const app = createApp(App);

// 基本上咱们js中的插件都是函数

const pinia = createPinia();

pinia.use(function ({ store }) {
  // 有几个store就执行几次
  let local = localStorage.getItem(store.$id + 'PINIA_STATE');
  if (local) {
    store.$state = JSON.parse(local);
  }
  store.$subscribe(({ storeId: id }, state) => {
    localStorage.setItem(`${id}PINIA_STATE`, JSON.stringify(state));
  });
  //   插件的核心就是利用$onAction $subscribe

  //   插件里面也可以return一个对象，这个对象会被合并到store里面
  return {
    a: 1,
  };
});
app.use(pinia); // 插件要求得有一个install方法

app.mount('#app');

// 在组件里面我们可以使用store
// 但是在路由里面我们可能使用不了store，因为inject方法无法使用，因此我们才考虑让pinia通过setActivePinia的方法放在全局上
// 那为啥有setActivePinia了还要用inject呢，因为有些人可能没有通过app.use调用pinia的install，所以没有调用setActivePinia，导致还是没有全局变量
// const store = useCounterStore1();
// console.log(store.count);
