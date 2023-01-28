import i18n from "@/plugins/locales"
import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, CancelToken } from "axios"
import { LoadingStack } from "./ui"

const _stack: LoadingStack = new LoadingStack()
let _token: string = ''

const SERVER_PATH = 'http://dh.local.innovors.info/api/'


function getHeaders() {
  return {
      "X-Authentication-Token": _token,
      "X-Preferred-Language": i18n.global.locale
  }
}

export function cancel_source() {
  return axios.CancelToken.source()
}

export class DataError extends Error {
  name = "DataError"
  message: string = ""
  remote_stack: Array<string> = []

  constructor(message: string, stack: Array<string>) {
    super(message)
    this.remote_stack = stack
  }
}

function _handleError<T>(promise: Promise<AxiosResponse>): Promise<T> {
  return promise.then(resp => {
    _stack.pop()
    if ('__exception__' in resp.data) {
      throw new DataError(
        resp.data.__exception__,
        resp.data.__tracestack__
      );
    }
    return resp.data as T
  }).catch((ex) => {
    _stack.pop()
    console.error(ex)

    let message = ex.message ?? ex.toString()
    if (message.match(/code 502/)) message = "backend-disconnected"
    else if (message.match("Forbidden.")) {
      localStorage.token = "";
      message = "forbidden";
      if (!location.href.endsWith("/login")) location.href = "/login";
    } else if (message.match("Unmatched credentials"))
      message = "unmatched-credentials";
    throw ex
  })
}

export async function call<T, U = any>(
  name: string, method: string = '', data: U | null = null, cancel?: CancelToken,
  progress_handler?: (progressEvent: AxiosProgressEvent) => void)
  : Promise<T> {
  _stack.push(name)
  let caller = data == null ? (url: string, data: any, config: AxiosRequestConfig) => axios.get(url, config) : axios.post
  switch (method) {
    case "put":
      caller = axios.put
      break
    case "delete":
      caller = axios.delete
      break
  }
  return await _handleError<T>(caller(
    SERVER_PATH + name,
    data ?? {},
    {
      headers: getHeaders(),
      cancelToken: cancel ?? cancel_source().token,
      onUploadProgress: progress_handler
    }
  ))
}


