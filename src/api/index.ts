import { nanoid } from "nanoid";
import { Dataset, MediaItem, Paragraph, PluginPage, Source } from "./dbo";
import { call } from "./net";
import { ParagraphSelection, SelectableParagraph, openWindow } from "./ui";
import remoteConfig from "./remoteConfig";
import { Singletons } from "./singleton";

const unavailableImage = new URL('@/assets/no-image.png', import.meta.url).href
const unavailableVideoThumbnail = new URL("@/assets/video.png", import.meta.url).href

export class UIMediaItem implements MediaItem {
  height: number = 0;
  width: number = 0;
  item_type: string = 'image';
  rating: number = 0;
  source: Source = {};
  thumbnail: string = '';
  _id: string = '';

  constructor(obj: Partial<MediaItem>) {
    Object.assign(this, obj)
  }

  get ['src'] () {
    let imgdomain = `img-${this._id.slice(-8)}${remoteConfig.meta.domain_delimiter}`
    let path = ''

    if (this.source.file) {
      if (this.source.file.indexOf('://') >= 0) {
        let ext = (this.source.url || '').split('.').pop() ?? ''
        let segs = this.source.file.split('://')
        path = `/images/${segs[0]}/${segs[1].replace('$', this._id)}/image.${ext.length <= 4 ? ext : 'data'}`
      }
      else if (this.source.file.match(/\.pdf$/) && typeof (this.source.page) !== 'undefined')
        path = `/images/file/${this.source.file}__hash/pdf/${this.source.page}/page.png`
      else
        path = `/images/file/${this.source.file}`
    }
    else if (this.source.url)
      path = this.source.url
    else
      path = `/images/object/${Buffer.from(JSON.stringify(this.source)).toString('base64')}`;

    if (remoteConfig.meta.multi_servers) return `//${imgdomain}${location.host}/` + path
    else return path
  }
}

const UnavailableImageItem = new UIMediaItem({
  source: { url: unavailableImage }
})

const UnavailableVideoThumbnailItem = new UIMediaItem({
  source: { url: unavailableVideoThumbnail }
})

export interface DatasetHierarchy {
  id: string
  name: string
  children: DatasetHierarchy[]
  label: string
}

export class UIDataset implements Dataset {
  allowed_users: string[] = [];
  display_name: string = '';
  mongocollection: string = '';
  name: string = '';
  order_weight: number = 0;
  sources: string[] = [];
  label: string = '';
  _id: string = '';

  constructor(obj: Partial<Dataset>) {
    Object.assign(this, obj)
  }

  get segments() {
    return (this.display_name || this.name).split('--')
  }

  get level() {
    return this.segments.length
  }

  static async get_datasets(): Promise<UIDataset[]> {
    return await call<Dataset[]>("datasets").then(data => data.map(x => new UIDataset(x)))
  }

  static async get_datasets_hierarchy() {
    let data: UIDataset[] = await this.get_datasets()
    let bundles: { [id: string]: { name: string, dataset_name: string, mongocollection: string } } = {}

    var hierarchy: DatasetHierarchy = {
      id: "ROOT",
      name: "",
      children: [],
      label: ""
    };

    for (var x of data) {
      var parent_obj = hierarchy;
      for (
        var i = 0, segs = x.segments[0]; i < x.level; i++, segs += "--" + x.segments[i]
      ) {
        var cand = parent_obj.children.filter((child) => child.id == segs)[0];
        if (typeof cand === "undefined") {
          cand = {
            id: segs,
            name: "",
            label: x.segments[i],
            children: [],
          };
          bundles[cand.id] = {
            name: segs,
            dataset_name: x.name,
            mongocollection: x.mongocollection,
          };
          parent_obj.children.push(cand);
        }
        parent_obj = cand;
      }
    }

    return {
      hierarchy: hierarchy.children,
      bundles,
    };
  }
}

export class UIParagraph implements SelectableParagraph {
  _id: string = '';
  source: Source = { file: '' };
  keywords: string[] = [];
  author: string = '';
  pdate: string | Date = '';
  outline: string = '';
  pagenum: string | number = '';
  content: string = '';
  lang: string = '';
  images: MediaItem[] = [];
  selected: boolean = false
  __selectId__: string = ''
  mongocollection: string = 'paragraph'
  private _matched_content?: string = ''

  constructor(obj: Partial<Paragraph>) {
    Object.assign(this, obj)
    this.__selectId__ = nanoid()
  }

  get matched_content() {
    return  this._matched_content || this.content
  }

  set matched_content(val: string) {
    this._matched_content = val
  }

  get coverImage() {
    let item = UnavailableImageItem

    if (this.images.length)
      item = new UIMediaItem(this.images[0])
    else if (this.source.page)
      item = new UIMediaItem({ source: this.source })

    if (item.item_type == 'video') {
      if (item.thumbnail) item = new UIMediaItem({ source: { file: item.thumbnail } })
      else item = UnavailableVideoThumbnailItem
    }

    return item.src
  }

  get scope() {
    if (this.author)
      return 'author=' + JSON.stringify(this.author);
    if (Array.isArray(this.keywords)) {
      var ats = this.keywords.filter(x => x.startsWith('@'))
      if (ats.length) return JSON.stringify(ats[0])
      var groups = this.keywords.filter(x => x.startsWith('#'))
      if (groups.length) return JSON.stringify(groups[0])
    }
    if (this._id)
      return 'id=o"' + this._id + '"';
    return '';
  }

  static guessGroups(condition: string | UIParagraph[]): string[] {
    if (typeof condition == 'string') {
      let words = condition.match(/([_\w\u4e00-\u9fa5]+)/g) || []
      return words
    }
    else {
      let candidates: string[] | null = null
      condition.forEach(p => {
        if (candidates) candidates = candidates.filter(x => p.keywords.includes(x))
        else candidates = p.keywords
      })
      return candidates
    }
  }

  set(field: string, value: string | number) {
    let obj : any = {}
    obj[field] = value
    Object.assign(this, obj)
  }

}

export class UIPluginPage implements PluginPage {
  keybind: string = '';
  icon: string = '';
  handler: string = '';
  name: string = '';
  format: string = '';

  constructor(obj: PluginPage) {
    Object.assign(this, obj)
  }

  formatString(fmt: string, bundle: { [key: string]: string | object | number }): string {
    function _replace(group: any, text: string): string {
      var b: string | null | object = bundle;
      for (var k of text.split("."))
        b = (b && typeof b == 'object' && k in b) ? b[k as keyof object] : "";
      return '' + b;
    }
    return (
      fmt.replace(/\{([\w\d._]+)\}/g, _replace) ||
      ""
    );
  }

  get formatter() {
    return (selection: ParagraphSelection<UIParagraph>) => (
      {
        q: `${(selection.first ?? new UIParagraph({})).scope};plugin('${this.formatString(this.format,
          {
            mediaitem: selection.first.images[0],
            paragraph: selection.first,
          }
        )}');`
      })
  }
}

export type Choice = { value: string, text: string }

type _Shortcut = { name: string, expr: string }

class ShortcutChoices {
  choices: Choice[] = []
  constructor() {
    call<_Shortcut[]>('plugins/shortcuts').then(data => this.choices = data.map(k => ({
      text: `${k.name} ${k.expr}`,
      value: k.expr,
    })))
  }
}

const shortcuts = Singletons.get<ShortcutChoices>(ShortcutChoices)

export function match_shortcuts(search: string, vm: { new_value: string[], typing: string }) {
  let auto_apply = false
  let typing = 'unset'
  let matched: Choice[] = []
  if (search) {
    matched = shortcuts.choices.filter(
      x => x.text.startsWith(search)
    )
    if (matched.length && matched[0].text.startsWith(search + ' ')) {
      auto_apply = true
      if (matched.length == 1) typing = 'clear'
    }
  }
  return { matched, auto_apply, typing }
}

export interface CallerOptions {
  selection: ParagraphSelection<UIParagraph>;
  values?: string[]
  append?: boolean
  del?: boolean
  rating?: RatingInfo
}

export interface CallResult {
  paragraphs?: { [id: string]: Partial<Paragraph> & { images: string[] } }
  items?: { [id: string]: Partial<MediaItem> }
  values?: string[]
}

export type RatingInfo = {
  inc?: number,
  val?: number,
  least?: number
}

export class Caller {

  private async makeCall(name: string, bundle: object, selection: ParagraphSelection<UIParagraph>): Promise<{ paragraphs: UIParagraph[], result: CallResult }> {
    let sel = selection.selection
    let result = await call<CallResult>(name, 'post', bundle)
    const { paragraphs, items } = result
    if (typeof paragraphs == 'object')
      sel.forEach(p => {
        selection.deselect(p)
        if (p._id in paragraphs) {
          let { images } = paragraphs[p._id]
          Object.assign(p, paragraphs[p._id], {
            images: Array.isArray(images) ?
              p.images.filter(i => images.includes(i._id)) :
              p.images
          })
        }
      })
    if (typeof items == 'object')
      sel.forEach(p => {
        selection.deselect(p)
        p.images.forEach(i => {
          if (i._id in items) {
            Object.assign(i, items[i._id])
          }
        })
      })
    return { result, paragraphs: sel }
  }

  tag(options: CallerOptions) {
    let { selection, values: tags, append } = options
    let push: string[] = [], pull: string[] = []
    let existing_tags = new Set(
      selection.selection.reduce((x: string[], y: UIParagraph) => x.concat(y.keywords), [])
    )
    if (append) {
      push = tags || []
      pull = []
    }
    else {
      push = (tags ?? []).filter(x => !existing_tags.has(x))
      pull = Array.from(existing_tags).filter(x => !tags?.includes(x))
    }
    let bundle: Partial<Paragraph> & { $push: object, $pull: object, ids: string[] } = {
      ids: selection.selectedParagraphs,
      $push: { keywords: push },
      $pull: { keywords: pull }
    }
    var new_author: string = push.filter(x => x.startsWith('@'))[0]
    if (new_author)
      bundle.author = new_author
    else if (pull.filter(x => x.startsWith("@")).includes(selection.first.author))
      bundle.author = ''

    return this.makeCall(`collections/${selection.first.mongocollection}/batch`, bundle, selection)
  }

  itemDelete(options: CallerOptions) {
    const { selection } = options
    var para_items = selection.selectionObject
    return this.makeCall("mediaitem/delete", { para_items }, selection)
  }

  rating(options: CallerOptions) {
    const { selection, rating } = options
    if (rating) {
      return this.makeCall("mediaitem/rating", { ids: selection.selectedItems, ...rating }, selection)
    }
  }

  group(options: CallerOptions) {
    const { selection, del, values } = options
    let bundle = {
      ids: selection.selectedParagraphs,
      ungroup: del ? true : false,
      group: values
    }
    return this.makeCall(`collections/${selection.first.mongocollection}/group`, bundle, selection).then(res => {
      const { paragraphs, result } = res
      const { values } = result
      if (values)
        paragraphs.forEach(p => {
          p.keywords = p.keywords.filter(t => !t.match(del ? /^#/ : /^#0/) &&
            !values.includes(t)).concat(values)
        })
    })
  }

  merge(options: CallerOptions) {
    const { selection } = options
    return this.makeCall(`collections/${selection.first.mongocollection}/merge`,
      {
        para_items: selection.selectionObject
      }, selection).then(res => {
        const { paragraphs, result } = res
        paragraphs.forEach(p => {
          if (!(p._id in (result.paragraphs ?? {}))) {
            p.images = []
            p.content = '[Merged]'
            p.keywords = []
          }
        })
      })
  }

  split(options: CallerOptions) {
    const { selection } = options
    return this.makeCall(`collections/${selection.first.mongocollection}/split`,
      {
        para_items: selection.selectionObject
      }, selection).then(res => {
        const { paragraphs } = res
        paragraphs.forEach(p => {
          p.images = []
          p.content = '[Splitted]'
          p.keywords = []
        })
      })
  }

  resetStorage(options: CallerOptions) {
    const { selection } = options
    return this.makeCall("mediaitem/reset_storage", {
      ids: selection.selectedItems
    }, selection)
  }

  setAuthor(options: CallerOptions) {
    const { selection, values: authors } = options
    const author = Array.isArray(authors) ? authors[0] : ''
    return this.makeCall(`collections/${selection.first.mongocollection}/batch`, {
      ids: selection.selectedParagraphs,
      author,
      $push: { keywords: author }
    }, selection)
  }

  applyPluginFilter(filter: UIPluginPage, selection: ParagraphSelection<UIParagraph>) {
    openWindow(filter.formatter(selection))
  }

}
