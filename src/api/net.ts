import i18n from "@/plugins/locales"
import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, CancelToken } from "axios"
import { LoadingStack } from "./ui"
import { User } from "./dbo"

export type UserLoginInfo = Partial<User> & {
  otp?: string,
  password?: string,
  token?: string,
  remember?: boolean
}

const _stack: LoadingStack = new LoadingStack()
let _token: string = '', _user: UserLoginInfo = {}

const SERVER_PATH = location.origin + '/api/'

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
  remoteStack: Array<string> = []

  constructor(message: string, stack: Array<string>) {
    super(message)
    this.remoteStack = stack
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

export function createEventSource() {
  return new EventSource(SERVER_PATH + 'queue/events')
}

export function authenticate(user?: UserLoginInfo) {
  let promise: Promise<UserLoginInfo>;
  if (user) {
    let { username, password, otp } = user
    if (otp) {
      promise = call("autenticate", 'post', { otp })
    }
    else {
      promise = call("authenticate", 'post', { username, password })
    }
  } else {
    promise = call("authenticate", 'get')
  }
  return promise.then((info) => {
    if (info.token) {
      _token = info.token
      _user = info
      localStorage['_token'] = _token
      if (user?.remember) {
        // set cookies....
      }
    }
  })
}

export function getUser() {
  return _user
}