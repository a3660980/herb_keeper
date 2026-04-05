import { cleanupE2EData, type E2ECleanupTargets } from "./supabase-admin"

export async function runWithE2ECleanup(
  action: () => Promise<void>,
  targets: E2ECleanupTargets
) {
  let actionError: unknown
  let cleanupError: unknown

  try {
    await action()
  } catch (error) {
    actionError = error
  } finally {
    try {
      await cleanupE2EData(targets)
    } catch (error) {
      cleanupError = error
    }
  }

  if (actionError) {
    if (cleanupError) {
      console.error("E2E cleanup also failed", cleanupError)
    }

    throw actionError
  }

  if (cleanupError) {
    throw cleanupError
  }
}