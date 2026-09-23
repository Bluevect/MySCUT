import { Clipboard } from '@capacitor/clipboard'

export async function clipboardReadText() {
  try {
    const readResult = await Clipboard.read()

    return readResult.value
  } catch (error) {
    // Fallback to navigator api
    if (!navigator.clipboard?.readText) {
      throw new Error("No navigator clipboard api")
    }

    const readResult = await navigator.clipboard.readText()
    return readResult
  }
}

export async function clipboardWriteText(data: string) {
  try {
    await Clipboard.write({
      string: data
    })
  } catch (error) {
    // Fallback to navigator api
    if (!navigator.clipboard?.writeText) {
      throw new Error("No navigator clipboard api")
    }

    await navigator.clipboard.writeText(data)
  }
}
