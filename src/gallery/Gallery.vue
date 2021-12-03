<template>
  <div>
    <v-toolbar flat>
      <v-row>
        <v-col>
          <v-checkbox
            v-model="config.contain"
            label="Show Full Image"
            @change="_save_config"
          ></v-checkbox>
        </v-col>
        <v-col>
          <v-checkbox
            v-model="config.force_thumbnail"
            label="Force Thumbnails"
            @change="_save_config"
          ></v-checkbox> </v-col
        ><v-col>
          <v-checkbox
            v-model="config.enhance"
            label="Enhance Image"
            @change="_save_config"
          ></v-checkbox>
        </v-col>
        <v-col>
          <v-btn text @click="_show_dialog('auto_tagging')">Auto Tagging</v-btn>
        </v-col>
        <v-col>
          <v-btn text href="/api/gallery/compare" target="_blank"
            >Hash Compare</v-btn
          ></v-col
        >
        <v-col>
          <v-autocomplete
            :items="pages"
            clearable
            v-model="post_option.post"
            @keyup.enter="call_tool"
            auto-select-first
          ></v-autocomplete>
        </v-col>
        <v-col>
          <v-text-field
            clearable
            @keyup.enter="call_tool"
            v-model="post_option.args"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-btn @click="call_tool" text>Call</v-btn>
        </v-col>
      </v-row>
    </v-toolbar>

    <v-toolbar flat>
      <v-row>
        <v-col cols="4">
          <v-text-field
            @keyup.enter="
              params_state = '';
              update({ ...sorting, direction: 'next' });
            "
            dense
            hint="Query"
            v-model="params.query"
          ></v-text-field>
        </v-col>
        <v-col cols="2">
          <v-text-field
            hint="Limit"
            v-model="params.limit"
            type="number"
            dense
            @change="_save_config"
            >40</v-text-field
          >
        </v-col>
        <v-col cols="2">
          <v-select
            v-model="sorting"
            hint="Sort"
            :items="sorts"
            single-line
            dense
          ></v-select>
        </v-col>
        <v-col cols="1">
          <v-checkbox
            v-model="params.archive"
            label="Archive"
            dense
          ></v-checkbox>
        </v-col>
        <v-col cols="1">
          <v-btn
            @click="
              params_state = '';
              update({ ...sorting, direction: 'next' });
            "
          >
            Load
          </v-btn>
        </v-col>
      </v-row>
    </v-toolbar>
    <tagging-dialog
      ref="tagging_dialog"
      :choices="tagging_choices"
      @submit="tag($event, false)"
    ></tagging-dialog>

    <tagging-shortcuts-dialog
      v-model="tagging_shortcuts"
      :choices="tagging_shortcut_list"
      :initial="tagging_shortcut_initial"
      :multiple="false"
      :match_initials="true"
      @submit="tag($event, true)"
    ></tagging-shortcuts-dialog>

    <v-container fluid v-show="drawer" class="groups">
      <v-row justify="start">
        <v-col
          v-for="g in groups"
          :key="g.group_id"
          cols="12"
          xs="12"
          sm="6"
          md="3"
          lg="2"
        >
          <v-card
            width="250"
            @click="g.selected = !g.selected"
            @dblclick="_open_window(`?query=${g.group_id}`)"
            :class="g.selected ? 'selected' : ''"
            style="overflow: hidden"
          >
            <v-img
              :contain="config.contain"
              height="150"
              :src="get_item_image(g.items[0])"
            ></v-img>
            <v-card-text>{{ g.group_id }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-container fluid class="albums">
      <v-row>
        <v-col
          cols="12"
          xs="12"
          sm="6"
          md="3"
          lg="2"
          v-for="(album, album_index) in albums"
          :key="`album_${album_index}_${album._id}`"
          :ref="`album_ref_${album._id}`"
        >
          <v-card
            :class="album.selected ? 'selected' : ''"
            @click="select_album(album_index, $event)"
            @dblclick="browse(album_index)"
          >
            <v-img
              :contain="config.contain"
              height="250"
              :src="get_item_image(album.items[0])"
            ></v-img>
            <v-card-text>
              <album-description :album="album"></album-description>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-pagination
        v-model="page"
        :length="length"
        :total-visible="0"
        @next="update({ order: next, direction: 'next' })"
        @previous="update({ order: prev, direction: 'prev' })"
      ></v-pagination>
      <v-card flat v-show="count">
        <v-card-text>Count: {{ count }}</v-card-text>
      </v-card>
    </v-container>

    <v-dialog v-model="dialogs.auto_tagging" fullscreen persistent>
      <auto-tags @close="dialogs.auto_tagging = false"></auto-tags>
    </v-dialog>

    <v-dialog v-model="browsing" fullscreen hide-overlay persistent>
      <v-card
        v-touch="{
          left: browse_next,
          right: browse_prev,
          down: () => (browsing = false),
          up: () => rating(1),
        }"
        class="browsing"
      >
        <v-btn class="close" icon @click="browsing = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-card v-if="browsing && browsing_index >= 0">
          <video
            width="100%"
            style="height: 90vh"
            controls
            v-if="browsing_item && browsing_item.source.url.split('.').pop() == 'mp4'"
          >
            <source :src="get_item_video(browsing_item)" type="video/mp4" />
          </video>
          <div
            style="width: 100%; text-align: center"
            @click="toggle_fits"
            v-else
          >
            <v-img
              height="100vh"
              width="100vw"
              :src="get_item_image(browsing_item)"
              :contain="config.fit !== 'both'"
              v-if="config.fit !== 'both'"
              ref="browsing_image"
            />
            <div
              :style="{
                height: '100vh',
                width: '100%',
                overflow: 'hidden',
              }"
              v-else
            >
              <img
                :src="get_item_image(browsing_item)"
                alt="Browsing Image"
                ref="image"
                @load="_fit_image"
              />
            </div>
          </div>
          <v-card-text class="browsing description">
            <v-row align="end">
              <v-col cols="3">
                <v-pagination
                  v-model="browsing_page"
                  :length="3"
                  :total-visible="0"
                  @previous="browse_prev"
                  @next="browse_next"
                ></v-pagination>
              </v-col>
              <v-col cols="9" class="item-description">
                <v-row>
                  <v-col cols="8" sm="6">
                    <v-rating
                      style="display: inline-block"
                      v-model="browsing_item.rating"
                      background-color="white"
                      color="yellow accent-4"
                      dense
                      half-increments
                      hover
                      size="18"
                      @input="rating({ val: $event })"
                    ></v-rating>
                    <span class="grey--text text--lighten-2">
                      ({{ browsing_item.rating.toFixed(1) }})
                    </span>
                  </v-col>
                  <v-col cols="2" sm="3">
                    <v-btn
                      icon
                      dense
                      :href="`?post=face/${browsing_item._id}&query='${browsing_album.author}'&archive=true`"
                      class="t_func facedet"
                      target="_blank"
                      v-show="browsing_item.faces && browsing_item.faces.length"
                    >
                      <v-icon>mdi-emoticon-outline</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      dense
                      :href="`?post=sim/${browsing_item._id}&query='${browsing_album.author}'&archive=true`"
                      class="t_func sim"
                      target="_blank"
                      ><v-icon>mdi-image</v-icon></v-btn
                    >
                    <v-btn icon dense @click="item_info = true" target="_blank"
                      ><v-icon>mdi-information</v-icon></v-btn
                    >
                  </v-col>
                  <v-spacer></v-spacer>
                </v-row>
                <album-description :album="browsing_album"></album-description>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-card>
    </v-dialog>

    <v-dialog v-model="item_info">
      <v-card>
        <v-card-title>
          <v-btn icon @click="item_info = false" style="margin-right: 12px">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          Item Info</v-card-title
        >
        <v-card-text>
          <v-row v-for="(v, k) in selected_items()[0]" :key="k">
            <v-col cols="4">{{ k }}</v-col>
            <v-col cols="8" v-if="!['album'].includes(k)">{{ v }}</v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="item_info = false"> OK </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div class="fabs">
      <v-badge
        bordered
        color="green darken-2"
        :content="'' + selected_albums_count"
        :value="selected_albums_count > 0"
        overlap
      >
        <v-btn fab small @click="toggle_selection" @dblclick="clear_selection">
          <v-icon>mdi-select-all</v-icon>
        </v-btn>
      </v-badge>

      <v-btn fab small @click="show_tagging_dialog()">
        <v-icon>mdi-tag</v-icon>
      </v-btn>

      <v-btn fab small @click="rating(1)">
        <v-icon>mdi-heart</v-icon>
      </v-btn>

      <v-btn fab small @click="group()">
        <v-icon>mdi-group</v-icon>
      </v-btn>

      <v-btn
        fab
        small
        @click="bus.$emit('alert', 'Double-click to confirm deletion')"
        @dblclick="delete_items()"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script>
import api from "./gallery-api";
import AlbumDescription from "./AlbumDescription.vue";
import TaggingDialog from "./TaggingDialog.vue";
import TaggingShortcutsDialog from "./TaggingShortcutsDialog.vue";
import AutoTags from "./AutoTags.vue";

export default {
  name: "Gallery",
  components: {
    AutoTags,
    AlbumDescription,
    TaggingDialog,
    TaggingShortcutsDialog,
  },
  data: () => ({
    bus: api.bus,

    last_id: -1,
    browsing: false,
    browsing_index: -1,
    browsing_page: 2,
    continue_browsing: false,
    tagging: false,
    tags: [],
    tagging_choices: null,
    tagging_shortcuts: false,
    tagging_shortcut_initial: "",
    tagging_shortcut_list: [],

    last_key: "",
    playing_timer: 0,
    playing_interval: 2000,
    drawer: true,
    item_info: false,

    albums: [],
    groups: [],
    prev: {},
    next: {},
    params: {
      query: "",
      post: "",
      order: {
        keys: ["-liked_at"]
      },
      limit: 40,
      archive: false,
    },
    page: 1,
    length: 999,
    count: 0,
    sorts: [
      { text: "Default", value: "" },
      {
        text: "Liked At",
        value: { order: { keys: ["-liked_at"] } },
      },
      {
        text: "Created At",
        value: { order: { keys: ["-pdate"] } },
      },
      {
        text: "Random",
        value: { order: { keys: ["random"] } },
      },
      {
        text: "Group ID",
        value: { order: { keys: ["group_id"], group_id: "" } },
      },
      {
        text: "Source",
        value: { order: { keys: ["source"], group_id: "" } },
      },
      {
        text: "Item Source",
        value: { order: { keys: ["items.source"], "items.source": "" } },
      },
      {
        text: "Rating",
        value: { order: { keys: ["-items.rating"], "items.rating": 10 } },
      },
    ],
    config: {
      fit: "both",
      contain: false,
      enhance: false,
      force_thumbnail: false,
      limit: 50,
    },
    sorting: null,
    post_option: { post: "", args: "" },
    pages: [],
    fab: false,
    params_state: "",
    selected_albums_count: 0,
    snackbars: [],
    dialogs: {
      auto_tagging: false,
    },
    logined: true,
  }),
  beforeDestroy() {
    window.removeEventListener("keydown", this._keydown_listener);
    window.removeEventListener("wheel", this._wheel_listener);
  },
  created() {
    window.addEventListener("keydown", this._keydown_listener);
    window.addEventListener("wheel", this._wheel_listener);
  },
  computed: {
    browsing_album() {
      return (this.browsing_item || { album: {} }).album;
    },
    browsing_item() {
      return this.browsing_items[this.browsing_index] || { url: "", _id: "" };
    },
    browsing_items() {
      var items = [];
      for (var album of this.albums)
        items = items.concat(
          album.items.map((x) => {
            x.album = album;
            return x;
          })
        );
      return items;
    },
  },
  watch: {
    albums() {
      if (this.continue_browsing) {
        this.continue_browsing = false;
        this.browsing_index =
          this.browsing_index == 0 ? this.browsing_items.length - 1 : 0;
        if (this.browsing_items.length == 0) this.browsing = false;
      }
    },
    browsing(val) {
      if (!val) this._scroll_to_browsing_album();
    },
  },
  mounted() {
    this._on_login();

    api.call("shortcuts", {}, "get").then((data) => {
      data = data.result
      for (var k in data)
        this.tagging_shortcut_list.push({
          text: `${k} ${data[k]}`,
          value: [data[k]],
        });
    });
  },
  methods: {
    _open_window(url) {
      window.open(url);
    },
    _show_dialog(dialog) {
      this.drawer = false;
      this.dialogs[dialog] = true;
    },
    _save_config() {
      this.config.limit = this.params.limit;
      api.save_config("gallery", this.config);
    },
    _on_login() {
      this.config = api.load_config("gallery", this.config);
      this.params.limit = this.config.limit;
      for (var pair of new URLSearchParams(location.search).entries()) {
        if (pair[1].startsWith("JSON__"))
          pair[1] = JSON.parse(pair[1].slice(6));
        else if (pair[1].match(/^\d+$/)) pair[1] = +pair[1];
        else if (pair[1].match(/^(true|false)$/)) pair[1] = pair[1] == "true";
        this.params[pair[0]] = pair[1];
      }
      this.post_option.post = this.params.post
        ? "page:" + this.params.post.split("/")[0]
        : "";
      this.post_option.args = this.params.post.split("/").slice(1).join(" ");
      this.update();
      api
        .call("plugins/special_pages")
        .then((data) => (this.pages = data.result));
    },
    clear_selection() {
      this.groups.concat(this.albums).forEach((x) => (x.selected = false));
    },
    update(obj) {
      if (obj && (!obj.order || (!obj.order.keys && !obj.order.offset))) {
        obj.order = { keys: ["-liked_at"] };
        this.page = 1;
      }
      Object.assign(this.params, obj);
      this.params.limit = +this.params.limit;
      document.title = `${this.params.post} ${this.params.query}`;
      api.fetch(this.params).then((data) => {
        this.albums = data.results;
        if (!data.prev) this.page = 1;
        else {
          this.prev = data.prev;
          this.page = 2;
        }
        if (!data.next) this.length = this.page;
        else {
          this.next = data.next;
          this.length = 3;
        }
        window.scrollTo(0, 0);
      });

      var url = "";
      for (var key in this.params) {
        if (typeof this.params[key] === "object")
          url +=
            "&" +
            key +
            "=JSON__" +
            encodeURIComponent(JSON.stringify(this.params[key]));
        else url += "&" + key + "=" + encodeURIComponent(this.params[key]);
      }
      history.pushState(null, null, "?" + url.substr(1));

      var state = JSON.stringify(
        Object.assign({}, this.params, {
          order: null,
          direction: "",
          archive: false,
          groups: false,
        })
      );
      if (state != this.params_state) {
        api
          .fetch(
            Object.assign({}, this.params, { groups: true, archive: false })
          )
          .then((data) => (this.groups = data.results));
        api
          .call(
            "get",
            Object.assign({}, this.params, { count: true }),
            "post",
            false
          )
          .then((data) => (this.count = data.result));
        this.params_state = state;
      }
    },
    call_tool() {
      if (!this.post_option.post) {
        this.params_state = "";
        this.post_option.args = "";
        this.update({ post: "" });
      } else if (this.post_option.post.startsWith("page:")) {
        let topost = this.post_option.post.slice(5);
        this.params_state = "";
        this.update({
          post: [topost || "", ...(this.post_option.args || "").split(" ")]
            .filter((x) => x)
            .join("/"),
        });
      }
    },
    _wheel_listener(e) {
      if (
        this.browsing &&
        !this.$refs.tagging_dialog.visible &&
        !this.tagging_shortcuts &&
        !this.item_info
      )
        if (e.deltaY > 0) {
          this.browse_next();
        } else {
          this.browse_prev();
        }
    },
    _keydown_listener(e) {
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;
      if (this.browsing) {
        switch (e.key) {
          case "ArrowLeft":
            if (this.playing_timer) clearInterval(this.playing_timer);
            this.browse_prev();
            break;
          case "ArrowRight":
            if (this.playing_timer) clearInterval(this.playing_timer);
            this.browse_next();
            break;
          case "g":
            document.querySelector(".browsing.description a.t_group").click();
            break;
        }
      } else {
        switch (e.key) {
          case "ArrowLeft":
            this.update({ order: this.prev, direction: "prev" });
            break;
          case "ArrowRight":
            this.update({ order: this.next, direction: "next" });
            break;
          case "f":
            this.toggle_selection();
            break;
          case "g":
            this.group(e.altKey || e.ctrlKey);
            break;
          case "p":
            e.altKey || e.ctrlKey ? this.split() : this.merge();
            break;
        }
      }
      switch (e.key.toLowerCase()) {
        case "t":
        case "@":
          this.show_tagging_dialog();
          break;
        case "n":
          this.tag([`noted:${new Date().toISOString()}`]);
          break;
        case "d":
          if (this.last_key == e.key && this.selected_albums().length > 0) {
            this.delete_items();
            this.last_key = null;
          }
          break;
        case "q":
        case "`":
        case "escape":
          this.browsing = false;
          this._clear_selected(this.albums);
          break;
        case "a":
        case "arrowup":
        case "arrowdown":
          if (this.selected_items().length)
            this.rating(e.key != "ArrowDown" ? 1 : -1);
          break;
        case "r":
          if (this.last_key == e.key && this.selected_albums().length > 0) {
            this.reset_storage();
            this.last_key = null;
          }
          break;
        case "c":
        case "z":
        case "s":
        case "e":
        case "o":
        case "i":
          if (this.selected_albums().length > 0) {
            var _item = this.selected_items()[0],
              _album = this.selected_albums()[0];
            switch (e.key.toLowerCase()) {
              case "o":
                this._open_window(_album.source.url);
                break;
              case "c":
                this._open_window(
                  `?query=${encodeURIComponent(_album.author) || ""}`
                );
                break;
              case "s":
                this._open_window(
                  `?post=sim/${_item._id}&archive=true&query=${
                    encodeURIComponent(_album.author) || ""
                  }`
                );
                break;
              case "e":
                this._open_window(
                  `?post=face/${_item._id}&archive=true&query=${
                    encodeURIComponent(_album.author) || ""
                  }`
                );
                break;
              case "z":
                this._open_window(
                  e.shiftKey
                    ? `?query=id%3D${_album._id}`
                    : `?query=source.url%'${_album.source.url
                        .replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")
                        .replace(/\/\d+\//, "/.*/")}'`
                );
                break;
              case "i":
                this.item_info = !this.item_info;
                break;
            }
          }
          break;
        case "enter":
          if (this.browsing) this.playing();
          else if (this.browsing_index < 0)
            this.browse(this.last_id >= 0 ? this.last_id : 0);
          else this.browsing = true;
          this._clear_selected();
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          this.tagging_shortcuts = this.selected_albums().length > 0;
          this.tagging_shortcut_initial = e.key;
          break;
      }

      this.last_key = this.last_key === null ? "" : e.key;
    },
    get_item_image(item) {
      return api.get_item_image(item, this.config);
    },
    get_item_video: api.get_item_video,
    select_album(album_id, event) {
      var id_start = album_id,
        id_end = this.last_id;
      if (id_end == -1) id_end = album_id;
      if (event.shiftKey) {
        if (id_start > id_end) {
          var tmp = id_start;
          id_start = id_end;
          id_end = tmp;
        }
        if (id_start == this.last_id) ++id_start;
        if (id_end == this.last_id) --id_end;
        this.albums
          .slice(id_start, id_end + 1)
          .forEach((album) => (album.selected = !album.selected));
        window.getSelection().removeAllRanges();
      } else {
        this.albums[album_id].selected = !this.albums[album_id].selected;
      }
      this.last_id = album_id;
      this.browsing_index = -1;
      this.selected_albums_count = this.selected_albums().length;
    },
    toggle_selection() {
      this.albums.forEach((x) => (x.selected = !x.selected));
      this.selected_albums_count = this.selected_albums().length;
    },
    _fit_image(e) {
      const img = e.target,
        scrr = window.clientWidth / window.clientH;
      const wh = window.innerHeight,
        ww = window.innerWidth,
        imgr = img.naturalWidth / img.naturalHeight;
      var nh = 0,
        nw = 0,
        transform = "",
        mode = "",
        offsetX = 0,
        offsetY = 0;

      if (imgr < 1 != scrr < 1) {
        mode = 1 / imgr >= scrr ? "fit-height" : "fit-width";
        switch (mode) {
          case "fit-width":
            nh = ww;
            nw = nh * imgr;
            offsetX = nh;
            offsetY = (wh - nw) / 2;
            break;
          case "fit-height":
            nw = wh;
            nh = nw / imgr;
            offsetX = (nh - ww) / 2;
            offsetY = 0;
            break;
        }
        transform = "rotate(90deg)";
      } else {
        mode = imgr >= scrr ? "fit-height" : "fit-width";
        switch (mode) {
          case "fit-width":
            nw = ww;
            nh = ww / imgr;
            break;
          case "fit-height":
            nh = wh;
            nw = nh * imgr;
            break;
        }
        transform += `translate(${(ww - nw) / 2}px, ${(wh - nh) / 2}px)`;
      }
      Object.assign(img.style, {
        height: nh + "px",
        width: nw + "px",
        transform: transform,
        "transform-origin": "left top",
        top: offsetY + "px",
        left: offsetX + "px",
        position: "absolute",
      });
    },
    selected_items() {
      if (this.browsing) {
        if (!this.browsing_item.album_id)
          this.browsing_item.album_id = this.browsing_album._id;
        return [this.browsing_item];
      }
      return this.selected_albums().reduce(
        (y, e) =>
          y.concat(
            e.items.map((i) => {
              if (!i.album_id) i.album_id = e._id;
              return i;
            })
          ),
        []
      );
    },
    selected_albums() {
      if (this.browsing) return [this.browsing_album];
      return this.albums
        .filter((x) => x.selected)
        .concat(this.groups.filter((x) => x.selected));
    },
    _selected_album_ids() {
      return Array.from(
        new Set(
          this.selected_albums()
            .map((x) => x._id)
            .concat(this.selected_items().map((x) => x.album_id))
        )
      );
    },
    _clear_selected(sel) {
      sel.forEach((x) => (x.selected = false));
      this.selected_albums_count = 0;
    },

    browse(album_index) {
      this.browsing_index = this.albums
        .slice(0, album_index)
        .reduce((x, y) => x + y.items.length, 0);
      this.browsing = true;
      this._clear_selected(this.albums);
    },
    playing() {
      this.playing_timer = setInterval(() => {
        if (!this.browsing) {
          clearInterval(this.playing_timer);
          this.playing_timer = 0;
          return;
        }
        this.browse_next();
      }, this.playing_interval);
    },
    _scroll_to_browsing_album() {
      const album_ele = this.$refs[`album_ref_${this.browsing_album._id}`] || [];
      if (album_ele[0]) window.scrollTo(0, album_ele[0].offsetTop);
    },
    browse_next() {
      if (this.browsing_index + 1 < this.browsing_items.length) {
        this.browsing_index++;
      } else {
        this.update({ order: this.next, direction: "next" });
        this.continue_browsing = true;
      }
      this.browsing_page = 2;
    },
    browse_prev() {
      if (this.browsing_index > 0) {
        this.browsing_index--;
      } else {
        this.update({ order: this.prev, direction: "prev" });
        this.continue_browsing = true;
      }
      this.browsing_page = 2;
    },
    toggle_fits() {
      const fits = ["both", "visible"];
      this.config.fit = fits[(fits.indexOf(this.config.fit) + 1) % fits.length];
      api.save_config("gallery", this.config);
    },
    // api calls
    show_tagging_dialog() {
      if (this.selected_albums().length > 0) {
        var existing_tags = new Set(
          this.selected_albums().reduce((a, e) => a.concat(e.tags), [])
        );
        this.$refs.tagging_dialog.show(Array.from(existing_tags));
      }
    },
    tag(e, append = true) {
      var s = this.selected_albums();
      var existing_tags = new Set(
        this.selected_albums().reduce((a, e) => a.concat(e.tags), [])
      );
      api
        .call("album/tag", {
          albums: this._selected_album_ids(),
          append: append ? e : e.filter((x) => !existing_tags.has(x)),
          delete: append
            ? []
            : Array.from(existing_tags).filter((x) => !e.includes(x)),
        })
        .then((data) => {
          this._clear_selected(s);
          s.forEach((p) => {
            data.result[p._id] && (p.tags = data.result[p._id]);
          });
        });
    },
    delete_items() {
      var s = this.selected_albums();
      var album_items = {},
        visible_album_items = {};

      this.selected_items().forEach((item) => {
        if (!album_items[item.album_id]) album_items[item.album_id] = [];
        album_items[item.album_id].push(item._id);
      });

      s.forEach((p) => {
        if (!visible_album_items[p._id]) visible_album_items[p._id] = [];
        visible_album_items[p._id].splice(
          0,
          0,
          ...(this.browsing
            ? [this.browsing_item._id]
            : p.items.map((i) => i._id))
        );
      });

      api
        .call("imageitem/delete", {
          album_items,
        })
        .then(() => {
          s.forEach((x) => {
            x.items = x.items.filter(
              (i) => !visible_album_items[x._id].includes(i._id)
            );
          });
          this._clear_selected(s);
        });
    },
    rating(inc) {
      var s = this.selected_albums();
      api
        .call("imageitem/rating", {
          items: this.browsing
            ? [this.browsing_item._id]
            : this.selected_items().map((x) => x._id),
          inc: inc.val ? 0 : inc,
          val: inc.val ? inc.val : 0,
        })
        .then((data) => {
          data = data.result || {};
          this._clear_selected(s);
          s.forEach((p) =>
            p.items.forEach(
              (i) =>
                typeof data[i._id] !== "undefined" && (i.rating = data[i._id])
            )
          );
        });
    },
    group(del) {
      var s = this.selected_albums();
      api
        .call("album/group", {
          albums: this._selected_album_ids(),
          delete: del,
        })
        .then((data) => {
          this._clear_selected(s);
          s.forEach(
            (p) =>
              (p.tags = p.tags
                .filter((x) => !x.startsWith("*0") && x !== data.result)
                .concat(data.result ? [data.result] : []))
          );
        });
    },
    merge() {
      var s = this.selected_albums();
      api
        .call("album/merge", {
          albums: this._selected_album_ids(),
        })
        .then(() => this._clear_selected(s));
    },
    split() {
      var s = this.selected_albums();
      api
        .call("album/split", {
          albums: this._selected_album_ids(),
        })
        .then(() => this._clear_selected(s));
    },
    reset_storage() {
      var s = this.selected_albums();
      api
        .call("imageitem/reset_storage", {
          items: this.browsing
            ? [this.browsing_item._id]
            : this.selected_items().map((x) => x._id),
        })
        .then(() => this._clear_selected(s));
    },
  },
};
</script>

<style scoped>
.v-card .v-image {
  display: none;
}
.v-card .v-image:first-child {
  display: block;
}
.v-card.selected::before {
  content: "\F012C";
  color: green;
  font-family: "Material Design Icons";
  display: block;
  z-index: 4;
  position: absolute;
  margin: 0;
  font-size: 40px;
  opacity: 1;
  background: rgba(255, 255, 255, 0.5);
}
.close {
  position: fixed;
  top: 10px;
  right: 20px;
  z-index: 2;
}
.description {
  position: fixed;
  bottom: 0;
  backdrop-filter: blur(5px);
  background-color: rgba(255, 255, 255, 0.5);
  opacity: 0;
}
.theme--dark .description {
  background-color: rgba(0, 0, 0, 0.5);
}
.description:hover {
  opacity: 1;
  z-index: 101;
}
.groups {
  width: 100%;
  clear: both;
  height: 220px;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 4;
}
.groups .row {
  flex-wrap: nowrap;
}
.browsing {
  overflow: hidden;
}
.fabs {
  position: fixed;
  z-index: 300;
  bottom: 16px;
  right: 16px;
}
.fabs > * {
  margin: 5px;
  clear: both;
  display: block;
}
</style>
