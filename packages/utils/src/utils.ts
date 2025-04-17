export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    const randomIndex: number = Math.floor(Math.random() * characters.length)
    result += characters.charAt(randomIndex)
  }

  return result
}

export function fetchOptionsData(url: string, dataQuery: string) {
  const abortController = new AbortController()
  const fetchOptions: RequestInit = {
    referrer: url,
    referrerPolicy: 'no-referrer-when-downgrade',
    method: 'POST',
    mode: 'cors',
    signal: abortController.signal,
    cache: 'default',
  }
  fetchOptions.headers = new window.Headers()
  fetchOptions.headers.set('Content-Type', 'application/json')
  fetchOptions.body = dataQuery
  return fetchOptions
}

export const withTimeout = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeout)),
  ])
}
