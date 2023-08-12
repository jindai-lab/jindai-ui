<template>
  <v-card flat>
    <v-card-title>{{ $t("file-storage") }}</v-card-title>
    <v-card-text>
      <v-progress-linear v-show="progress > 0" v-bind="progress" />
      <input type="file" value="" id="file" @change="upload_file" hidden multiple />
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
        <v-text-field v-model="search" clearable flat hide-details prepend-inner-icon="mdi-magnify"
          :label="$t('search')" @keyup.enter="search_file" :clear-icon-cb="update_files"></v-text-field>
      </v-toolbar>
      <v-sheet>
        <v-data-table :items="files.filter(x => x.name == '..' || !x.name.startsWith('.'))" :items-per-page="20"
          :page.sync="page" :headers="[
            {text: $t('name'), value: 'name'},
            {text: $t('operations'), value: 'actions'},
          ]">
          <template v-slot:item.name="{item}">
            <v-btn icon :href="file_link(item)" v-if="item.type === 'file'">
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <v-btn icon v-else @click="enter(item.name)">
              <v-icon v-if="item.type == 'folder'">mdi-folder-open</v-icon>
              <v-icon v-else>mdi-arrow-left-circle</v-icon>
            </v-btn>
            {{ item.name == ".." ? $t("parent-dir") : item.name }}
            <div class="description" v-if="item.type == 'file'">
              {{ $t("size") }}: {{ (item.size / 1024 / 1024).toFixed(2) }} MB
              {{ $t("created-at") }}: {{ new Date(item.ctime * 1000).toISOString() | dateSafe }}
              {{ $t("modified-at") }}: {{ new Date(item.mtime * 1000).toISOString() | dateSafe }}
            </div>
          </template>
          <template v-slot:item.actions="{item}">
            <v-btn @click="copy_file_path(item)" v-if="item.type !== 'back'" icon>
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
            <v-btn v-if="item.name.match(/^jindai\.plugins\..*\.zip$/)" @click="install_plugin(item)" icon>
              <v-icon>mdi-cog-outline</v-icon>
            </v-btn>
            <v-btn v-if="item.type !== 'back'" icon @click="rename_file(item)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-sheet>
    </v-sheet>
    <v-card-actions>
    </v-card-actions>
  </v-card>
</template>

<script>


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
      this.business.storage(this.selected_dir, { mkdir: folder }).then(() => {
        this.update_files()
      })
    },
    upload_file(e) {
      let data = new FormData();
      for (var i = 0; i < e.target.files.length; ++i)
        data.append("file" + i, e.target.files[i]);

      this.api
        .upload(this.selected_dir, data, (e) => {
          this.progress = ((e.loaded * 100) / e.total) | 0;
        })
        .then((data) => {
          this.progress = 0;
          for (var r of data.results)
            this.files.splice(this.selected_dir != "" ? 1 : 0, 0, r);
        });
    },
    search_file() {
      if (this.search) {
        this.business.storage(this.selected_dir, { search: this.search })
          .then((data) => {
            this.files = data.results;
          });
      } else {
        this.update_files();
      }
    },
    file_link(f) {
      return "/api/storage/" + f.fullpath.trimLeft('/');
    },
    install_plugin(f) {
      this.business.install_plugin(f.fullpath).then(() => {
        this.$notify(this.$t("installed"));
      });
    },
    rename_file(f) {
      var new_name = prompt(this.$t("raname-to"), f.name);
      if (!new_name) return;
      this.business.storage('move', 
        { source: f.fullpath, destination: new_name }).then(() =>
          this.update_files()
        )
    },
    update_files() {
      this.business.storage(this.selected_dir).then((data) => {
        this.files = data.results;
        if (this.selected_dir !== "")
          this.files.splice(0, 0, { name: "..", type: "back" });
        history.pushState(
          null,
          null,
          this.api.querystring_stringify({
            path: this.selected_dir,
          })
        );
      });
    },
    copy_file_path(f) {
      const text = 'file://' + f.fullpath;
      this.api.copy_to_clipboards(text)
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
    this.selected_dir = this.api.querystring_parse(location.search).path || "";
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

.opers>* {
  margin-left: 10px;
}
</style>
