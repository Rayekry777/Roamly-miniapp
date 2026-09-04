export function createRequestScope() {
  let active = true;
  return {
    close: () => {
      active = false;
    },
    run: async <T>(operation: Promise<T>): Promise<T | undefined> => {
      const result = await operation;
      return active ? result : undefined;
    },
  };
}
