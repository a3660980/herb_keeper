import { cookies } from "next/headers"

const FLASH_ERROR_COOKIE = "flash_error"

export async function setFlashError(message: string) {
  const cookieStore = await cookies()
  cookieStore.set(FLASH_ERROR_COOKIE, `${Date.now()}|${message}`, {
    path: "/",
    maxAge: 30,
    httpOnly: false,
    sameSite: "lax",
  })
}

export async function consumeFlashError(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(FLASH_ERROR_COOKIE)?.value ?? null
}
