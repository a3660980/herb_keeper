import { cookies } from "next/headers"

const FLASH_ERROR_COOKIE = "flash_error"
const FLASH_SUCCESS_COOKIE = "flash_success"

async function setFlashCookie(name: string, message: string) {
  const cookieStore = await cookies()
  cookieStore.set(name, `${Date.now()}|${message}`, {
    path: "/",
    maxAge: 30,
    httpOnly: false,
    sameSite: "lax",
  })
}

async function consumeFlashCookie(name: string): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(name)?.value ?? null
}

export async function setFlashError(message: string) {
  await setFlashCookie(FLASH_ERROR_COOKIE, message)
}

export async function consumeFlashError(): Promise<string | null> {
  return consumeFlashCookie(FLASH_ERROR_COOKIE)
}

export async function setFlashSuccess(message: string) {
  await setFlashCookie(FLASH_SUCCESS_COOKIE, message)
}

export async function consumeFlashSuccess(): Promise<string | null> {
  return consumeFlashCookie(FLASH_SUCCESS_COOKIE)
}
