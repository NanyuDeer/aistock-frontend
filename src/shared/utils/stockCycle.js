import { reactive } from 'vue';
import { useStore } from 'vuex';

const STORAGE_PREFIX = 'stock_cycle_';
const cycleMap = reactive({});

function loadFromLocalStorage(userId) {
  try {
    const prefix = `${STORAGE_PREFIX}${userId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const code = key.slice(prefix.length);
        cycleMap[code] = localStorage.getItem(key);
      }
    }
  } catch (e) {
    console.warn('[stockCycle] 读取 localStorage 失败', e);
  }
}

export function useStockCycle() {
  const store = useStore();

  const getUserId = () => {
    const user = store.state.user;
    return user?.id || user?.openid || 'guest';
  };

  const getCycle = (code) => {
    if (!code) return 'default';
    if (cycleMap[code] !== undefined) return cycleMap[code];
    const userId = getUserId();
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}_${code}`);
      if (stored) {
        cycleMap[code] = stored;
        return stored;
      }
    } catch (e) {
      console.warn('[stockCycle] 读取失败', e);
    }
    return 'default';
  };

  const setCycle = (code, cycle) => {
    if (!code) return;
    const value = cycle || 'default';
    cycleMap[code] = value;
    const userId = getUserId();
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${userId}_${code}`, value);
    } catch (e) {
      console.warn('[stockCycle] 写入失败', e);
    }
  };

  const initCycles = () => {
    const userId = getUserId();
    loadFromLocalStorage(userId);
  };

  return { getCycle, setCycle, initCycles };
}
