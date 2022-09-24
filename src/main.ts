import { createApp, effectScope, reactive } from 'vue';
import './style.css';
import App from './App.vue';
import { createPinia } from './pinia';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');

// const scope = effectScope();
// scope.run(() => {
//   const scope1 = effectScope();
//   console.log(1111);
//   return scope1.run(() => {
//     const a = reactive({ name: '1' });
//     console.log(2222);
//     return { a };
//   });
// });
// console.log(3333);
// const scope = effectScope();
// scope.run(() => {
//   console.log(1111);
//   const scope1 = effectScope();
//   return scope1.run(() => {
//     const a = reactive({ name: '1' });
//     console.log(2222);
//     return { a };
//   });
// });
// console.log(3333);
