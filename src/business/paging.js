import api from "../api"


class Paging {

  constructor(page_size, prefetch_size, updater) {
    this.page_size = page_size
    this.prefetch_size = prefetch_size
    this._updater = updater
    this._page = 0
    this._offset_start = 0
    this._offset_end = 0
    this._data = []
  }

  get ['offset']() {
    return (this._page - 1) * this.page_size;
  }

  get ['page']() {
    return this._page
  }

  get ['visible']() {
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
        x.src = api.get_paragraph_image(x);
        [...x.images.slice(0, 5), ...x.images.slice(-1)].map((i) => {
          if (i.item_type == "image") {
            let image = new Image();
            image.src = api.get_item_image(i);
          }
        });
      }
    })
  }

  reset() {
    this._offset_end = this._offset_start = 0
    this._page = 1
  }

  turn_page(p) {
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
        
        if (Array.isArray(data) && !data.length) {
          this._page = 1;
        }
        this._offset_start = this.offset
        this._offset_end = this._offset_start + data.length
        this._data = data
        this._prefetch_images()
        return this.visible
      
      })
    }
  }

}

export default Paging;