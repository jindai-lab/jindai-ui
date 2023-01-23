class Selection {

  constructor(paragraphs) {
    this.paragraphs = paragraphs
    this._chosen_item = []
  }

  get ['length']() {
    return this.paragraphs.length
  }

  get ['ids']() {
    return this.paragraphs.map(x => x._id)
  }

  clear() {
    this.paragraphs.forEach(x => x.selected = false)
    this.paragraphs.splice(0, this.paragraphs.length)
    this._chosen_item = []
  }

  set(to) {
    this.clear()
    to.forEach(x => this.add(x))
  }

  toggle(all) {
    all.forEach((x) => {
      if (x.selected) this.remove(x)
      else this.add(x)
    });
  }

  remove(p) {
    var index = this.paragraphs.findIndex(x => x._id == p._id)
    if (index >= 0) {
      this.paragraphs[index].selected = false
      this.paragraphs.splice(index, 1)
    }
    this._chosen_item = []
  }

  add(p) {
    if (this.paragraphs.includes(p)) return
    p.selected = true
    this.paragraphs.push(p)
    this._chosen_item = []
  }

  choose_item(item) {
    this._chosen_item = Array.isArray(item) ? item : [item]
  }

  get ['items']() {
    if (this._chosen_item.length)
      return this._chosen_item.map(i => {
        i.paragraph_id = this.paragraphs[0]._id
        return i
      })
    return this.paragraphs.reduce(
      (y, e) =>
        y.concat(
          e.images.map((i) => {
            if (!i.paragraph_id) i.paragraph_id = e._id;
            return i;
          })
        ),
      []
    );
  }

  get['first'] () {
    return this.paragraphs[0] || {}
  }

  to_objects() {

    var para_items = {},
      visible_para_items = {};

    this.items.forEach((item) => {
      if (!para_items[item.paragraph_id])
        para_items[item.paragraph_id] = [];
      para_items[item.paragraph_id].push(item._id);
    });

    this.paragraphs.forEach((p) => {
      if (!visible_para_items[p._id]) visible_para_items[p._id] = [];
      visible_para_items[p._id].splice(
        0,
        0,
        ...this.items.map((i) => i._id)
      );
    });

    return {
      para_items,
      visible_para_items,
    };
  }

}
 
export default Selection;