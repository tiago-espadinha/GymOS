export async function getFromStorage(key: string): Promise<any> {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function saveToStorage(key: string, value: any): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

export default {
  getFromStorage,
  saveToStorage,
};
