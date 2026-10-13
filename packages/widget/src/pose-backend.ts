export async function openWithDelegateFallback<T>(
  create: (delegate: "GPU" | "CPU") => Promise<T>,
): Promise<{ delegate: "GPU" | "CPU"; value: T }> {
  try {
    return { delegate: "GPU", value: await create("GPU") };
  } catch {
    return { delegate: "CPU", value: await create("CPU") };
  }
}
