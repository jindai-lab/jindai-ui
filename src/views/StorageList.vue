<template>
  <v-card flat>
    <v-card-title>{{ $t("file-storage") }}</v-card-title>
    <v-card-text>
      <v-progress-linear v-show="progress > 0" v-bind="progress" />
      <input
        type="file"
        value=""
        id="file"
        @change="upload_file"
        hidden
        multiple
      />
      <v-row>
        <v-col>
          <v-btn color="primary" @click="open_file_dialog()">
            <v-icon>mdi-upload</v-icon> {{ $t("upload") }}
          </v-btn>
          <v-btn color="primary" class="ml-5" @click="new_folder()">
            <v-icon>mdi-plus</v-icon> {{ $t("new-folder") }}
          </v-btn>
          <span class="name ml-5">{{ selected_dir }}</span>
        </v-col>
      </v-row>
    </v-card-text>
    <v-sheet class="ma-5">
      <v-toolbar flat>
        <v-text-field
          v-model="search"
          clearable
          flat
          hide-details
          prepend-inner-icon="mdi-magnify"
          :label="$t('search')"
          @keyup.enter="search_file"
          :clear-icon-cb="update_files"
        ></v-text-field>
      </v-toolbar>
      <v-sheet>
        <v-data-iterator
          :items="files"
          :items-per-page="20"
          :page.sync="page"
          hide-default-footer
        >
          <template v-slot:default="props">
            <template v-for="f in props.items">
              <v-row
                :key="f.fullpath"
                v-if="f.name == '..' || !f.name.startsWith('.')"
              >
                <v-col class="name">
                  <v-btn icon :href="file_link(f)" v-if="f.type === 'file'">
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                  <v-btn icon v-else @click="enter(f.name)">
                    <v-icon v-if="f.type == 'folder'">mdi-folder-open</v-icon>
                    <v-icon v-else>mdi-arrow-left-circle</v-icon>
                  </v-btn>

                  {{ f.name == ".." ? $t("parent-dir") : f.name }}

                  <div class="description" v-if="f.type == 'file'">
                    {{ $t("size") }}: {{ (f.size / 1024 / 1024).toFixed(2) }} MB
                    {{ $t("created-at") }}: {{ (f.ctime * 1000) | dateSafe }}
                    {{ $t("modified-at") }}:
                    {{ (f.mtime * 1000) | dateSafe }}
                  </div>
                </v-col>
                <v-spacer></v-spacer>
                <v-col class="opers">
                  <v-btn
                    @click="copy_file_path(f)"
                    v-if="f.type !== 'back'"
                    icon
                  >
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                  <v-btn
                    v-if="f.name.match(/^jindai\.plugins\..*\.zip$/)"
                    @click="install_plugin(f)"
                    icon
                  >
                    <v-icon>mdi-cog-outline</v-icon>
                  </v-btn>
                  <v-btn v-if="f.type !== 'back'" icon @click="rename_file(f)">
                    <v-icon>mdi-form-textbox</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </template>
          </template>

          <template v-slot:footer>
            <v-row class="mt-2" align="center" justify="center">
              <v-btn
                small
                dark
                fab
                color="blue darken-3"
                class="mr-1"
                @click="() => page > 1 && --page"
              >
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
              <span class="mr-4 ml-4 grey--text">
                {{ $t("pagination", { page, total: pages_count }) }}
              </span>
              <v-btn
                small
                dark
                fab
                color="blue darken-3"
                class="ml-1"
                @click="() => page < pages_count && ++page"
              >
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
            </v-row>
          </template>
        </v-data-iterator>
      </v-sheet>
    </v-sheet>
    <v-card-actions>
      <input type="hidden" id="testing-code" />
    </v-card-actions>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  name: "StorageList",
  data() {
    return {
      files: [],
      selected_dir: "",
      progress: 0,
      admin: false,
      search: "",
      page: 1,
    };
  },
  computed: {
    pages_count() {
      return Math.ceil(this.files.length / 20);
    },
  },
  methods: {
    open_file_dialog() {
      document.getElementById("file").click();
    },
    new_folder() {
      var folder = prompt(this.$t("folder-name"))
      if (!folder) return
      api.call(`storage/${this.selected_dir}`, {mkdir: folder}).then(() => {
        this.update_files()
      })
    },
    upload_file(e) {
      let data = new FormData();
      for (var i = 0; i < e.target.files.length; ++i)
        data.append("file" + i, e.target.files[i]);

      api
        .upload(this.selected_dir, data, (e) => {
          this.progress = ((e.loaded * 100) / e.total) | 0;
        })
        .then((data) => {
          this.progress = 0;
          for (var r of data.result)
            this.files.splice(this.selected_dir != "" ? 1 : 0, 0, r);
        });
    },
    search_file() {
      if (this.search) {
        api
          .call(`storage/${this.selected_dir}`, { search: this.search })
          .then((data) => {
            this.files = data.result;
          });
      } else {
        this.update_files();
      }
    },
    file_link(f) {
      return "/api/storage/" + f.fullpath.split("/").slice(1).join("/");
    },
    install_plugin(f) {
      api.call("plugins", { url: f.fullpath }).then((data) => {
        if (data.result) api.notify(this.$t("installed"));
      });
    },
    rename_file(f) {
      var new_name = prompt(this.$t("raname-to"), f.name);
      if (!new_name) return;
      api.call(
        "storage/move",
        { source: f.fullpath, destination: new_name }.then(() =>
          this.update_files()
        )
      );
    },
    update_files() {
      api.call("storage/" + this.selected_dir).then((data) => {
        this.files = data.result;
        if (this.selected_dir !== "")
          this.files.splice(0, 0, { name: "..", type: "back" });
        history.pushState(
          null,
          null,
          api.querystring_stringify({
            path: this.selected_dir,
          })
        );
      });
    },
    copy_file_path(f) {
      const text = f.fullpath.substr(1);
      const testingCodeToCopy = document.querySelector("#testing-code");
      testingCodeToCopy.setAttribute("type", "text");
      testingCodeToCopy.setAttribute("value", text);
      testingCodeToCopy.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        alert("Oops, unable to copy");
      }
      testingCodeToCopy.setAttribute("type", "hidden");
      window.getSelection().removeAllRanges();
    },
    enter(d) {
      if (d === "..")
        this.selected_dir = this.selected_dir.split("/").slice(0, -1).join("/");
      else
        this.selected_dir = this.selected_dir
          .split("/")
          .filter((x) => x)
          .concat(d)
          .join("/");
    },
  },
  mounted() {
    this.selected_dir = api.querystring_parse(location.search).path || "";
    this.update_files();
  },
  watch: {
    selected_dir() {
      this.update_files();
    },
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  min-width: 300px;
  padding-right: 20px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}

.description {
  font-size: 12px;
}

.opers > * {
  margin-left: 10px;
}
</style>
