export async function getFromStorage(key: string): Promise<any> {
  try {
    const result = await (window as any).storage.get(key);
    return result ? JSON.parse(result.value) : null;
  } catch {
    return null;
  }
}

export async function saveToStorage(key: string, value: any): Promise<void> {
  try {
    await (window as any).storage.set(key, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

export default {
  getFromStorage,
  saveToStorage,
};
