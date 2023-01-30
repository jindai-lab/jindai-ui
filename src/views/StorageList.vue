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
            { text: $t('name'), value: 'name' },
            { text: $t('operations'), value: 'actions' },
          ]">
          <template v-slot:item.name="{ item }">
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
              {{ $t("created-at") }}: {{ dtstr(item.ctime * 1000) }}
              {{ $t("modified-at") }}:
              {{ dtstr(item.mtime * 1000) }}
            </div>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn @click="copy_file_path(item)" v-if="item.type !== 'back'" icon>
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
            <v-btn v-if="item.name.match(/^jindai\.plugins\..*\.zip$/)" @click="install_plugin(item)" icon>
              <v-icon>mdi-cog-outline</v-icon>
            </v-btn>
            <v-btn v-if="item.type !== 'back'" icon @click="rename_file(item)">
              <v-icon>mdi-textbox</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-sheet>
    </v-sheet>
    <v-card-actions>
      <input type="hidden" id="testing-code" />
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { FileStorageItem } from "@/api/dbo"
import { call } from "@/api/net";
import { dtstr, qsparse, qstringify } from "@/api/ui"
import { notify } from "@/dialogs";
import { AxiosProgressEvent } from "axios";

export default {
  name: "StorageList",
  data() {
    return {
      files: [] as FileStorageItem[],
      selected_dir: "",
      progress: 0,
      admin: false,
      search: "",
      page: 1,
    };
  },
  methods: {
    dtstr,
    open_file_dialog() {
      document.getElementById("file")?.click();
    },
    new_folder() {
      var folder = prompt(this.$t("folder-name"))
      if (!folder) return
      call(`storage/${this.selected_dir}`, 'post', { mkdir: folder }).then(() => {
        this.update_files()
      })
    },
    upload_file(e: Event) {
      const target = (e.target as HTMLInputElement).files || []
      let data = new FormData();
      for (var i = 0; i < (target.length || 0); ++i)
        data.append("file" + i, target[i]);

      call<FileStorageItem[]>(this.selected_dir, 'post', data, undefined, (e: AxiosProgressEvent) => {
        this.progress = ((e.loaded * 100) / (e.total || 1)) | 0;
      })
        .then((data) => {
          this.progress = 0;
          for (var r of data)
            this.files.splice(this.selected_dir != "" ? 1 : 0, 0, r);
        });
    },
    search_file() {
      if (this.search) {
        call<FileStorageItem[]>(`storage/${this.selected_dir}`, 'post', { search: this.search })
          .then((data) => {
            this.files = data;
          });
      } else {
        this.update_files();
      }
    },
    file_link(f: FileStorageItem) {
      return "/this.api/storage/" + f.fullpath.replace(/^\/+/, '')
    },
    install_plugin(f: FileStorageItem) {
      call("plugins", 'post', { url: f.fullpath }).then((data) => {
        if (data) notify(this.$t("installed"));
      });
    },
    rename_file(f: FileStorageItem) {
      var new_name = prompt(this.$t("raname-to"), f.name);
      if (!new_name) return;
      call(
        "storage/move",
        'post',
        { source: f.fullpath, destination: new_name }).then(() =>
          this.update_files()
        )
    },
    update_files() {
      call<FileStorageItem[]>("storage/" + this.selected_dir).then((data) => {
        this.files = data;
        if (this.selected_dir !== "")
          this.files.splice(0, 0, {
            name: "..", type: "back", fullpath: '..', 'created-at': 0, 'modified-at': 0, size: 0
          });
        history.pushState(
          null,
          '',
          qstringify({
            path: this.selected_dir,
          })
        );
      });
    },
    copy_file_path(f: FileStorageItem) {
      const text = 'file://' + f.fullpath;
      const testingCodeToCopy = document.querySelector("#testing-code") as HTMLInputElement;
      testingCodeToCopy.setAttribute("type", "text");
      testingCodeToCopy.setAttribute("value", text);
      testingCodeToCopy.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        alert("Oops, unable to copy");
      }
      testingCodeToCopy.setAttribute("type", "hidden");
      window.getSelection()?.removeAllRanges();
    },
    enter(d: string) {
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
    this.selected_dir = qsparse(location.search).path || "";
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
