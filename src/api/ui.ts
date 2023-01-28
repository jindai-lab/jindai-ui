import { MediaItem, Paragraph } from "./dbo";
import assert from "assert";
import { UIMediaItem } from "./business";

export interface ParagraphItemObject {
  [id: string]: Array<string>
}

export interface SelectableParagraph extends Paragraph {
  __selectId__: string
  selected: boolean
}

export class ParagraphSelection<T extends SelectableParagraph> {
  paragraphs: T[]
  _selected: Set<string>
  _selected_items: MediaItem[]

  constructor(all: Paragraph[], TParagraph: new (paragraph: Paragraph) => T) {
    this._selected = new Set()
    this._selected_items = []
    this.paragraphs = all.map(para => new TParagraph(para))
  }

  chooseItem(i: MediaItem): void {
    this._selected_items = [i]
  }

  has(para: SelectableParagraph): boolean {
    return this._selected.has(para.__selectId__)
  }

  select(para: SelectableParagraph): boolean {
    if (this._selected_items) this._selected_items = []
    if (this.has(para)) return false
    this._selected.add(para.__selectId__)
    para.selected = true
    return true
  }

  deselect(para: SelectableParagraph): boolean {
    if (this._selected_items) this._selected_items = []
    if (!this.has(para)) return false
    this._selected.delete(para.__selectId__)
    para.selected = false
    return true
  }

  toggle(...paras: Array<SelectableParagraph>) {
    if (paras.length == 0)
      paras = this.paragraphs
    paras.forEach(para => {
      if (para.selected) this.deselect(para)
      else this.select(para)
    });
  }

  clear() {
    if (this._selected_items) this._selected_items = []
    this.paragraphs.forEach(p => this.deselect(p))
  }

  get selectedParagraphs(): string[] {
    return Array.from(new Set(this.selection.map(p => p._id)))
  }

  get selectedItems(): string[] {
    if (this._selected_items.length) return this._selected_items.map(i => i._id)
    let ids: string[] = []
    return this.selection.map(p => p.images).reduce((prev, current) => prev.concat(current.map(i => i._id)), ids)
  }

  get length(): number {
    return this._selected.size
  }

  get first(): T {
    return this.paragraphs[0] ?? { images: [] }
  }

  get selection(): T[] {
    return this.paragraphs.filter(x => this.has(x))
  }

  get selectionObject(): ParagraphItemObject {
    const dobj: ParagraphItemObject = {}
    if (this.first && this._selected_items.length) {
      dobj[this.first._id] = this.selectedItems
    } else {
      this.selection.forEach(p => {
        if (dobj[p._id])
          dobj[p._id].push(...p.images.map(i => i._id))
        else
          dobj[p._id] = p.images.map(i => i._id)
      })
    }
    return dobj
  }
}

export interface UpdateOptions {
  limit: number
  offset: number
}

export type UpdaterFunction =
  (options: UpdateOptions) => Promise<Array<Paragraph>>


export class Paging {

  page_size: number
  prefetch_size: number
  _updater: UpdaterFunction
  _url_getter: (i: MediaItem) => string
  _page: number
  _offset_start: number
  _offset_end: number
  _data: Array<Paragraph>

  constructor(page_size: number, prefetch_size: number, updater: UpdaterFunction) {
    this.page_size = page_size
    this.prefetch_size = prefetch_size
    this._updater = updater
    this._page = 1
    this._offset_start = 0
    this._offset_end = 0
    this._data = []
  }

  get offset() {
    return (this._page - 1) * this.page_size;
  }

  get page() {
    return this._page
  }

  get visible() {
    return this._data.slice(
      this.offset - this._offset_start,
      this.offset - this._offset_start + this.page_size
    )
  }

  _fetched() {
    return (
      this._offset_start <= this.offset && this._offset_end > this.offset
    );
  }

  _prefetch_images() {
    // preload images for every item
    this.visible.map((x) => {
      if (x.images) {
        [...x.images.slice(0, 5), ...x.images.slice(-1)].map((i) => {
          if (i.item_type == "image") {
            let image = new Image();
            image.src = new UIMediaItem(i).getUrl();
          }
        });
      }
    })
  }

  reset() {
    this._offset_end = this._offset_start = 0
    this._page = 1
    this._data = []
  }

  turn_page(p: number) {
    this._page = p
    if (this._fetched()) {
      // return directly from prefetched data
      return new Promise(accept => {
        this._prefetch_images()
        accept(this.visible)
      })
    } else {
      return this._updater({
        offset: this.offset,
        limit: this.prefetch_size
      }).then(data => {
        if (!data) throw new Error('no data')
        this._offset_start = this.offset
        this._offset_end = this._offset_start + data.length
        this._data = data
        this._prefetch_images()
        return this.visible
      })
    }
  }

}

export class LoadingStack {
  _list: Array<string> = []

  getLoadingBar() {
    return document.getElementById('loadingBar') ?? { style: { opacity: '1' } }
  }

  push(val: string) {
    this._list.push(val)
    this.getLoadingBar().style.opacity = '1'
  }

  pop() {
    if (this._list.length) this._list.pop()
    if (this._list.length == 0)
      this.getLoadingBar().style.opacity = '0'
  }
}

export function format(format_string: string, params: object) {
  return ''
}

export function qsparse(str: string = '') {
  var params: { [id: string]: any } = {}
  for (var pair of new URLSearchParams(str || location.search.substring(1)).entries()) {
    let [key, pval] = pair
    var val: any
    if (key.startsWith("JSON__")) val = JSON.parse(pval.substring(6));
    else if (pval.match(/^\d+$/)) val = parseInt(pval);
    else if (pval.match(/^(true|false)$/)) val = val == "true";
    else val = pval
    params[key] = val;
  }
  return params;
}

export function qstringify(obj: object) {
  var str = "";
  for (var k in obj) {
    let o = obj[k as keyof typeof obj];
    str += `&${k}=`;
    switch (typeof o) {
      case "object":
        str += "JSON__" + encodeURIComponent(JSON.stringify(o));
        break;
      case "string":
        str += encodeURIComponent(o);
        break;
      default:
        str += o;
        break;
    }
  }
  if (str === "") return "";
  return "?" + str.substring(1);
}

export function blob_download(blob: Blob, filename: string) {
  var url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // this is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    })
  );

  setTimeout(() => {
    // For Firefox it is necessary to delay revoking the ObjectURL
    window.URL.revokeObjectURL(url);
    link.remove();
  }, 100);
}

export function escape_regex(x: string): string {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function querify(obj: any): string {

  function _debracket(x: string) {
    if (x.match(/^\(.*\)$/)) {
      var stack = 0;
      for (var c of x.substr(1, x.length - 2)) {
        switch (c) {
          case "(":
            ++stack;
            break;
          case ")":
            if (stack) --stack;
            else return x;
            break;
          case ",":
          case "|":
            return x;
        }
      }
      if (stack == 0) return x.substring(1, x.length - 2);
    }
    return x;
  }

  if (Array.isArray(obj)) {
    if (obj.length == 0) return "[]";
    else if (obj.length == 1) {
      return "[" + _debracket(querify(obj[0])) + "]";
    } else {
      return (
        "[" + obj.map((x) => _debracket(querify(x))).join(",") + "]"
      );
    }
  }

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj == "object") {
    var s = "";
    for (var kvpair of Object.entries(obj)) {
      let [key, val] = kvpair;
      switch (key) {
        case "$and":
          assert(Array.isArray(val), 'value should be an array')
          s +=
            ",(" +
            val.map((x) => _debracket(querify(x))).join(",") +
            ")";
          break;
        case "$or":
          assert(Array.isArray(val), 'value should be an array')
          s +=
            ",(" +
            val.map((x) => _debracket(querify(x))).join("|") +
            ")";
          break;
        case "$options":
          break;
        case "$regex":
          s += "%" + querify(val);
          break;
        default:
          if (key.startsWith("$"))
            s +=
              "," + key.substring(1) + "(" + _debracket(querify(val)) + ")";
          else {
            s += "," + key;
            let pval = querify(val);
            if (pval.startsWith("(%")) {
              s += pval.substring(1, pval.length - 2);
            } else {
              s += "=" + pval;
            }
          }
          break;
      }
    }
    return "(" + _debracket(s.replace(/^,/, "")) + ")";
  }

  return JSON.stringify(obj);
}

export function open_window(url: string | object) {
  let urlstring = ''
  if (typeof url == 'object')
    urlstring = '/' + qstringify(url)
  else
    urlstring = url.toString()
  window.open(urlstring)
}
