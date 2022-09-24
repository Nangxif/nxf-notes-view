import { defineStore } from '../pinia';

// defineStore中的id是独一无二的
// 最终我们的pinia需要管理所有的状态，那我怎么知道哪个状态对应的是哪个store，那么就可能大概需要这么一个映射表
/**
	{
		counter => state, 
		xxx => state
	}
*/
export const useCounterStore = defineStore('counter', {
  // 上面的counter也可以写在对象里面
  // id: 'counter',
  state: () => {
    return {
      count: 0,
    };
  },
  getters: {
    dobule() {
      return this.count * 2;
    },
  },
  actions: {
    increment(payload) {
      this.count += payload;
    },
  },
});


// import { defineStore } from 'pinia';
// import { ref } from 'vue';

// defineStore中的id是独一无二的
// 最终我们的pinia需要管理所有的状态，那我怎么知道哪个状态对应的是哪个store，那么就可能大概需要这么一个映射表
/**
	{
		counter => state, 
		xxx => state
	}
*/
// export const useCounterStore = defineStore('counter', () => {
//   const count = ref(1);
//   return { count };
// });

