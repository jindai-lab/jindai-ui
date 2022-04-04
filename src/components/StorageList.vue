<template>
  <v-card flat>
    <v-card-title>文件</v-card-title>
    <v-card-text>
      <v-btn color="primary" @click="open_file_dialog()">
        <v-icon>mdi-upload</v-icon> 上传文件
      </v-btn>
      <v-progress-linear v-show="progress > 0" v-bind="progress" />
      <input
        type="file"
        value=""
        id="file"
        @change="upload_file"
        hidden
        multiple
      />
    </v-card-text>
    <v-sheet class="ma-5">
      <v-sheet>
        <v-row v-for="f in files" :key="f.name">
          <v-col class="name">
            <v-btn icon :href="file_link(f)" v-if="f.type === 'file'">
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <v-btn icon v-else @click="enter(f.name)">
              <v-icon v-if="f.type == 'folder'">mdi-folder-open</v-icon>
              <v-icon v-else>mdi-arrow-left-circle</v-icon>
            </v-btn>

            {{ f.name == '..' ? '返回上一级' : f.name }}

            <div class="description" v-if="f.type == 'file'">
              大小: {{ (f.size / 1024 / 1024).toFixed(2) }} MB 创建于:
              {{ (f.ctime * 1000) | dateSafe }} 修改于:
              {{ (f.mtime * 1000) | dateSafe }}
            </div>
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="opers">
            <v-btn class="copy" @click="copy_file_path(f)" v-if="f.type !== 'back'">
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-sheet>
    </v-sheet>
    <v-card-actions>
      <input type="hidden" id="testing-code" />
    </v-card-actions>
  </v-card>
</template>

<script>
import api from "../api";
import axios from "axios";

export default {
  name: "StorageList",
  data() {
    return {
      files: [],
      selected_dir: "",
      progress: 0,
    };
  },
  methods: {
    open_file_dialog() {
      document.getElementById("file").click();
    },
    upload_file(e) {
      let formData = new FormData();
      for (var i = 0; i < e.target.files.length; ++i)
        formData.append("file" + i, e.target.files[i]);

      api
        ._catch_and_then(
          axios.put(
            api.apiBase + "storage/" + this.selected_dir,
            formData,
            api._config({
              onUploadProgress: (e) => {
                this.progress = ((e.loaded * 100) / e.total) | 0;
              },
            })
          )
        )
        .then((data) => {
          this.progress = 0;
          for (var r of data.result)
            this.files.splice(this.selected_dir != "" ? 1 : 0, 0, r);
        });
    },
    file_link(f) {
      return "/api/storage/" + f.fullpath.split("/").slice(1).join("/");
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
</style>
