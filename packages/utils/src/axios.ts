import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
axios.defaults.timeout = 30000

export async function sendRequest(
  nodeURL: string,
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
        baseURL: nodeURL,
        url: subURL,
      })
    } else {
      if (data == undefined) {
        throw new Error("For Post Request 'data' Should Not Be 'undefined'")
      }
      resData = await axios({
        method: 'post',
        baseURL: nodeURL,
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

export const useAxios = async <T>({
  axiosParams,
}: {
  axiosParams: AxiosRequestConfig
  responseDataKey?: string
}): Promise<T> => {
  return new Promise((resolve, reject) => {
    axios
      .request(axiosParams)
      .then((response: AxiosResponse<T>) => {
        resolve(response?.data)
      })
      .catch(async (error) => {
        if (error.response?.status.toString().includes('203')) {
          // Handle specific status code if needed
        } else if (error.response?.status.toString().includes('4')) {
          reject(error.response?.data?.message)
        } else if (error.response?.status.toString().includes('5')) {
          let errObj = {
            code: 5000,
            status: false,
            //message: Strings.somethingWentWrong,
            data: {},
          }
          reject(JSON.stringify(errObj))
        } else {
          reject(JSON.stringify(error?.response?.data))
        }
      })
  })
}
