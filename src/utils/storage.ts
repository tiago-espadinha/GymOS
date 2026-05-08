export async function getFromStorage<T>(key: string): Promise<T | null> {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Writes a value and reports whether the browser kept it. A full quota or
 * blocked storage makes `setItem` throw; callers that save the user's data
 * check the result instead of assuming the write landed.
 */
export function saveToStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export default {
  getFromStorage,
  saveToStorage,
};
