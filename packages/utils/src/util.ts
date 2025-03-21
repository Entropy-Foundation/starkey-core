import axios, { AxiosResponse } from 'axios';
const TIMEOUT_ERROR = new Error('timeout');

/**
 * Execute fetch and verify that the response was successful.
 *
 * @param request - Request information.
 * @param options - Fetch options.
 * @returns The fetch response.
 */
export async function successfulFetch(
  request: URL | RequestInfo,
  options?: RequestInit
) {
  const response = await fetch(request, options);
  if (!response.ok) {
    throw new Error(
      `Fetch failed with status '${response.status}' for request '${String(
        request
      )}'`
    );
  }
  return response;
}

/**
 * Execute fetch and return object response.
 *
 * @param request - The request information.
 * @param options - The fetch options.
 * @returns The fetch response JSON data.
 */
export async function handleFetch(
  request: URL | RequestInfo,
  options?: RequestInit
) {
  const response = await successfulFetch(request, options);
  const object = await response.json();
  return object;
}

/**
 * Execute fetch and return object response, log if known error thrown, otherwise rethrow error.
 *
 * @param request - the request options object
 * @param request.url - The request url to query.
 * @param request.options - The fetch options.
 * @param request.timeout - Timeout to fail request
 * @param request.errorCodesToCatch - array of error codes for errors we want to catch in a particular context
 * @returns The fetch response JSON data or undefined (if error occurs).
 */
export async function fetchWithErrorHandling({
  url,
  options,
  timeout,
  errorCodesToCatch,
}: {
  url: string;
  options?: RequestInit;
  timeout?: number;
  errorCodesToCatch?: number[];
}) {
  let result;
  try {
    if (timeout) {
      result = Promise.race([
        await handleFetch(url, options),
        new Promise<Response>((_, reject) =>
          setTimeout(() => {
            reject(TIMEOUT_ERROR);
          }, timeout)
        ),
      ]);
    } else {
      result = await handleFetch(url, options);
    }
  } catch (e) {
    logOrRethrowError(e, errorCodesToCatch);
  }
  return result;
}

/**
 * Fetch that fails after timeout.
 *
 * @param url - Url to fetch.
 * @param options - Options to send with the request.
 * @param timeout - Timeout to fail request.
 * @returns Promise resolving the request.
 */
export async function timeoutFetch(
  url: string,
  options?: RequestInit,
  timeout = 500
): Promise<Response> {
  return Promise.race([
    successfulFetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => {
        reject(TIMEOUT_ERROR);
      }, timeout)
    ),
  ]);
}

/**
 * Utility method to log if error is a common fetch error and otherwise rethrow it.
 *
 * @param error - Caught error that we should either rethrow or log to console
 * @param codesToCatch - array of error codes for errors we want to catch and log in a particular context
 */
function logOrRethrowError(error: unknown, codesToCatch: number[] = []) {
  if (!error) {
    return;
  }

  if (error instanceof Error) {
    const includesErrorCodeToCatch = codesToCatch.some((code) =>
      error.message.includes(`Fetch failed with status '${code}'`)
    );

    if (
      includesErrorCodeToCatch ||
      error.message.includes("Failed to fetch") ||
      error === TIMEOUT_ERROR
    ) {
      console.error(error);
    } else {
      throw error;
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error;
  }
}

export async function sendRequest (
  supraNodeURL: string,
  subURL: string,
  data?: any,
  isGetMethod?: boolean,
  controller?: AbortController
): Promise<AxiosResponse<any, any>> {
  try {
    let resData
    if (isGetMethod) {
      resData = await axios({
        method: 'get',
        baseURL: supraNodeURL,
        url: subURL,
      })
    } else {
      if (data == undefined) {
        throw new Error("For Post Request 'data' Should Not Be 'undefined'")
      }
      resData = await axios({
        method: 'post',
        baseURL: supraNodeURL,
        url: subURL,
        data: data,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller?.signal, // Attach abort signal
      })
    }
    if (resData.status == 404) {
      throw new Error('Invalid URL, Path Not Found')
    }
    return resData
  } catch (error: any) {
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message)
    }
    throw error
  }
}