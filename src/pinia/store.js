// 这里存放 defineStore的api

// createPinia(), 默认是一个插件具备一个install方法
// _s 用来存储 id->store
// state 用来存储所有状态的
// _e 用来停止所有状态的

// id  + options
// options
// id + setup
import {
  getCurrentInstance,
  inject,
  reactive,
  effectScope,
  computed,
  isRef,
  isReactive,
  toRefs,
  watch,
} from 'vue';
import { setActivePinia, activePinia, piniaSymbol } from './rootStore';
import { triggerSubscription, addSubscription } from './subscriptions';

function isComputed(v) {
  // 计算属性是一个ref，同时也是一个effect
  return !!(isRef(v) && v.effect);
}
function isObject(value) {
  return typeof value === 'object' && value !== null;
}
// Object.assign只能合并一层，所以还是要自己实现
function mergeReactiveObject(target, state) {
  for (let key in state) {
    let oldValue = target[key];
    let newValue = state[key];
    // 新值和老值也可能是对象，所以合并的时候可能要递归
    if (isObject(oldValue) && isObject(newValue)) {
      target[key] = mergeReactiveObject(oldValue, newValue);
    } else {
      target[key] = newValue;
    }
  }
  return target;
}
/**
 * createOptionsStore和createSetupStore有部分逻辑是一致的，换种说法，
 * 在useStore里面，会区分传给defineStore的参数是什么类型的，如果参数有options那么就调用createOptionsStore创建一个store
 * 而createOptionsStore的功能就是将传给defineStore的options拼凑成一个setup，然后再传给createSetupStore去创建一个store
 * 如果参数有setup，那么就直接调用createSetupStore去创建一个store
 * 而createSetupStore里面会将自带的methods添加到store上面
 * */
function createSetupStore(id, setup, pinia, isOption) {
  let scope;

  function $patch(partialStateOrMutatior) {
    if (typeof partialStateOrMutatior === 'object') {
      // 用新的状态合并老的状态
      mergeReactiveObject(pinia.state.value[id], partialStateOrMutatior);
    } else {
      partialStateOrMutatior(pinia.state.value[id]);
    }
  }
  // 当用户状态变化的时候 可以监控到变化 并且通知用户 发布订阅
  let actionSubscribes = [];
  const partialStore = {
    // 批处理的api
    $patch,
    // 监听属性变化
    $subscribe(callback, options) {
      // watch，这里之所以用scope包一层是为了后面$dispose之后，$subscribe的监听也可以失效
      scope.run(() =>
        watch(
          pinia.state.value[id],
          (state) => {
            // 监控状态变化
            callback({ type: 'dirct' }, state);
          },
          options
        )
      );
    },
    // 监听触发action
    $onAction: addSubscription.bind(null, actionSubscribes),
    $dispose: () => {
      scope.stop(); // 清除响应式
      actionSubscribes = []; //取消订阅
      pinia._s.delete(id); // 删除store, 数据变化了不会再更新视图
    },
  };

  // 后续一些不是用户定义的属性和方法，内置的api会增加到这个store上
  const store = reactive(partialStore); // store就是一个响应式对象而已

  const initialState = pinia.state.value[id]; //对于setup api 没有初始化过状态

  if (!initialState && !isOption) {
    // 这样才能表示是一个setup api
    pinia.state.value[id] = {};
  }

  // 父亲可以停止所有 , setupStore 是用户传递的属性和方法
  // _e 能停止所有的store
  // 每个store还能停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope(); // 自己可以停止自己
    return scope.run(() => setup());
  });
  function wrapAction(name, action) {
    return function () {
      // 触发action的时候 可以触发一些额外的逻辑
      const afterCallbackList = [];
      const onErrorCallbackList = [];

      function after(callback) {
        afterCallbackList.push(callback);
      }

      function onError(callback) {
        onErrorCallbackList.push(callback);
      }

      // 触发actionSubscriptions中订阅的store.$Action的全部回调函数,并将参数传入
      // 此时store.$Action的callback已经执行,但是after onError的回调函数尚未执行
      // 触发action
      triggerSubscription(actionSubscribes, {
        after,
        onError,
        store,
        name,
      });

      let ret;
      try {
        ret = action.apply(store, arguments); // 直接出错
      } catch (error) {
        triggerSubscription(onErrorCallbackList, error);
      }

      if (ret instanceof Promise) {
        return ret
          .then((value) => {
            triggerSubscription(afterCallbackList, value);
          })
          .catch((error) => {
            triggerSubscription(onErrorCallbackList, error);
            return Promise.reject(error);
          });
      } else {
        triggerSubscription(afterCallbackList, ret);
      }
      return ret;
    };
  }
  for (let key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop == 'function') {
      // 你是一个action
      // 对action中的this 和 后续的逻辑进行处理 ， 函数劫持
      setupStore[key] = wrapAction(key, prop);
    }

    // 如何看这个值是不是状态state，如果这个值是一个ref或者reactive，不包括computed，那么他就可以认为是store的state
    // computed也是ref
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      if (!isOption) {
        pinia.state.value[id][key] = prop;
      }
    }
  }
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (state) => $patch(($state) => Object.assign($state, state)),
  });

  store.$id = id;
  pinia._s.set(id, store); // 将store 和 id映射起来

  pinia._p.forEach((plugin) => {
    // 将插件的返回值作为store的属性
    Object.assign(
      store,
      scope.run(() => plugin({ store }))
    );
  });

  Object.assign(store, setupStore);
  return store;
}

function createOptionsStore(id, options, pinia) {
  const { state, actions, getters } = options;
  function setup() {
    // 这里面会对用户传递的state，actions getters 做处理
    pinia.state.value[id] = state ? state() : {};
    // localState不做处理的话就是一个普通的对象
    // 我们需要将状态转成ref，因为普通值是没有响应式的，需要转换成ref才具备响应式
    const localState = toRefs(pinia.state.value[id]);
    // getters
    return Object.assign(
      localState, // 用户的状态
      actions, // 用户的动作
      Object.keys(getters || {}).reduce((memo, name) => {
        // 用户计算属性
        memo[name] = computed(() => {
          let store = pinia._s.get(id);
          return getters[name].call(store);
        });
        return memo;
      }, {})
    );
  }
  const store = createSetupStore(id, setup, pinia, true);
  //   只有options api才有$reset方法，setup api没有
  //   因为setup api我们不知道初始状态是什么
  store.$reset = function () {
    const newState = state ? state() : {};
    store.$patch((state) => {
      // 默认状态覆盖掉老状态
      Object.assign(state, newState);
    });
  };
}
/**
 * 参可能的值
 * id + options
 * options
 * id + setup
 * 因为我们在使用defineStore的时候，是返回一个useStore
 * 最后这个useStore在使用的时候，是useStore()然后返回一个store，那么说明useStore是一个函数
 * */
export function defineStore(idOrOptions, setup) {
  let id;
  let options;

  if (typeof idOrOptions === 'string') {
    id = idOrOptions;
    options = setup;
  } else {
    options = idOrOptions;
    id = idOrOptions.id;
  }
  // 判断setup是否为一个函数
  const isSetupStore = typeof setup === 'function';

  function useStore() {
    // 获取当前组件的实例
    // 在这里我们拿到的store 应该是同一个
    let instance = getCurrentInstance();
    // 使用inject获取在createPinia注入的pinia
    let pinia = instance && inject(piniaSymbol);
    if (pinia) {
      setActivePinia(pinia);
    }
    // 全局变量给你，这个一定存在
    pinia = activePinia;
    if (!pinia._s.has(id)) {
      // 第一次如果，没有这个id, 则创建仓库
      // 第一次useStore
      if (isSetupStore) {
        createSetupStore(id, setup, pinia);
      } else {
        // 如果是第一次 则创建映射关系
        createOptionsStore(id, options, pinia);
      }
    }
    // 后续通过id 获取对应的store返回

    const store = pinia._s.get(id);

    return store;
  }

  return useStore; // 用户最终拿到是这个store
}
