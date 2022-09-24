import {
  computed,
  effectScope,
  getCurrentInstance,
  inject,
  isRef,
  reactive,
  toRefs,
  watch
} from 'vue'
import { activePinia, Pinia, piniaSymbol, setActivePinia } from './rootStore'
import { triggerSubscription, addSubscription } from './subscriptions'
/**
 * 参可能的值
 * id + options
 * options
 * id + setup
 * 因为我们在使用defineStore的时候，是返回一个useStore
 * 最后这个useStore在使用的时候，是useStore()然后返回一个store，那么说明useStore是一个函数
 * */
export function defineStore(idOrOptions: any, setup?: any, setupOptions?: any) {
  let id: string
  let options: any

  // 第一个传是ID
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = setup
  } else {
    // 对象
    options = idOrOptions
    id = idOrOptions.id
  }
  // 判断setup是否为一个函数
  const isSetupStore = typeof setup === 'function'

  // 创建store 并添加到pinia._m中
  function useStore() {
    // 获取当前组件的实例
    const currentInstance = getCurrentInstance()

    // 使用inject获取在createPinia注入的pinia
    let pinia: Pinia | undefined | null = currentInstance && inject(piniaSymbol)

    if (pinia) setActivePinia(pinia)

    pinia = activePinia

    // 第一次如果，没有这个id, 则创建仓库
    if (!pinia?._s.has(id)) {
      // 如果setup参数是一个函数，那么就创建一个setupStore，否则创建一个optionsStore
      if (isSetupStore) {
        createSetupStore(id, setup, pinia)
      } else {
        createOptionsStore(id, options, pinia)
      }
    }

    const store = pinia?._s.get(id)

    return store
  }

  return useStore
}

export const isObject = value => {
  return typeof value === 'object' && value !== null
}
// 对象的对象也会层层合并
function mergeReactiveObject(target, partialState) {
  for (const key in partialState) {
    if (!partialState.hasOwnProperty(key)) continue
    const oldValue = target[key]
    const newValue = partialState[key]
    if (isObject(oldValue) && isObject(newValue) && isRef(newValue)) {
      target[key] = mergeReactiveObject(oldValue, newValue)
    } else {
      target[key] = newValue
    }
  }
  return target
}

/**
 * createOptionsStore和createSetupStore有部分逻辑是一致的，换种说法，
 * 在useStore里面，会区分传给defineStore的参数是什么类型的，如果参数有options那么就调用createOptionsStore创建一个store
 * 而createOptionsStore的功能就是将传给defineStore的options拼凑成一个setup，然后再传给createSetupStore去创建一个store
 * 如果参数有setup，那么就直接调用createSetupStore去创建一个store
 * 而createSetupStore里面会将自带的methods添加到store上面
 * */ 
function createSetupStore(id, setup, pinia) {
  let scope

  // _e 能停止所有的store
  // 每个store还能停止自己的
  const setupStore = pinia._e.run(() => {
    scope = effectScope()
    return scope.run(() => setup())
  })

  function wrapAction(name, action) {
    return function () {
      // 触发action的时候 可以触发一些额外的逻辑
      const afterCallbackList: any = []
      const onErrorCallbackList: any = []

      function after(callback) {
        afterCallbackList.push(callback)
      }

      function onError(callback) {
        onErrorCallbackList.push(callback)
      }

       // 触发actionSubscriptions中订阅的store.$Action的全部回调函数,并将参数传入
        // 此时store.$Action的callback已经执行,但是after onError的回调函数尚未执行
      // 触发action
      triggerSubscription(actionSubscribes, {
        after,
        onError,
        store,
        name
      })

      let ret
      try {
        ret = action.apply(store, arguments) // 直接出错
      } catch (error) {
        triggerSubscription(onErrorCallbackList, error)
      }

      if (ret instanceof Promise) {
        return ret
          .then(value => {
            triggerSubscription(afterCallbackList, value)
          })
          .catch(error => {
            triggerSubscription(onErrorCallbackList, error)
            return Promise.reject(error)
          })
      } else {
        triggerSubscription(afterCallbackList, ret)
      }
      return ret
    }
  }

  for (const key in setupStore) {
    const prop = setupStore[key]
    // 如果prop是一个函数，那么认为他就是一个action，因为有一个自定义methods叫$action需要action调用的时候去触发他的回调函数，所以需要在wrapAction里面进行处理
    if (typeof prop === 'function') {
      setupStore[key] = wrapAction(key, prop)
    }
  }

  function $patch(partialStateOrMutation) {
    if (typeof partialStateOrMutation === 'function') {
      partialStateOrMutation(store)
    } else {
      mergeReactiveObject(store, partialStateOrMutation)
    }
  }

  // 用于监听state中属性的变化
  // 当用户状态变化的时候 可以监控到变化 并且通知用户 发布订阅
  let actionSubscribes = []
  const partialStore = {
    $patch,
    $subscribe(callback, options) {
      // watch
      scope.run(() =>
        watch(
          pinia.state.value[id],
          state => {
            // 监控状态变化
            callback({ type: 'dirct' }, state)
          },
          options
        )
      )
    },
    $onAction: addSubscription.bind(null, actionSubscribes),
    $dispose: () => {
      scope.stop()
      actionSubscribes = []
      pinia._s.delete(id) // 删除store, 数据变化了不会再更新视图
    }
  }

  // 每一个store都是一个响应式对象
  const store = reactive(partialStore)

  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: state => $patch($state => Object.assign($state, state))
  })

  // 最终会将处理好的setupStore 放到store的身上
  Object.assign(store, setupStore) // reactive 中放ref 会被拆包  store.count.value

  // 每个store 都会应用一下插件
  pinia._p.forEach(plugin => Object.assign(store, plugin({ store, pinia, app: pinia._a, id })))

  pinia._s.set(id, store)
  return store as any
}

function createOptionsStore(id: string, options: any, pinia) {
  const { state, getters, actions } = options

  function setup() {
    // 这里会对用户传递state，actions，getters做处理
    pinia.state.value[id] = state ? state() : {}

    const localState = toRefs(pinia.state.value[id])

    // getters
    // 解决this问题
    /**
     * const store = useCounter();
     * store.increment();
     * 这么写increment的this指向肯定是store，如果通过解构呢？
     *
     *
     * const { increment } = useCounter();
     * increment(); 如果不做处理的话，this指向就不是store了
     * */
    return Object.assign(
      localState,
      actions,
      Object.keys(getters || {}).reduce((computeGetters, name) => {
        // 用户计算属性
        computeGetters[name] = computed(() => {
          return getters[name].call(store, store)
        })
        return computeGetters
      }, {})
    )
  }

  const store = createSetupStore(id, setup, pinia)

  // 重置
  store.$reset = () => {
    const newState = state ? state() : {}
    store.$patch($state => {
      Object.assign($state, newState)
    })
  }

  return store as any
}
