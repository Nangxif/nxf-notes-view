export const piniaSymbol = Symbol();
export let activePinia; //全局变量
export const setActivePinia = (pinia) => (activePinia = pinia);
