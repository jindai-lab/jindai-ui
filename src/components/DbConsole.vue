<template>
  <div>
    <h3>数据库控制台</h3>
    <div>
      <div class="mui-panel">
        <ParamInput
          class="mui-textfield"
          :arg="{
            name: 'Mongo Collection',
            type: mongocollectionsstr || 'paragraph',
          }"
          v-model="command.mongocollection"
          @change="previewed = false"
        />
        <ParamInput
          ref="editor"
          class="mui-textfield"
          :arg="{ name: 'Query', type: 'js' }"
          v-model="command.query"
          @change="previewed = false"
        />
        <ParamInput
          class="mui-textfield"
          :arg="{ name: 'Operation', type: 'update_many|delete_many|count' }"
          v-model="command.operation"
          @change="previewed = false"
        />
        <ParamInput
          ref="editor"
          class="mui-textfield"
          :arg="{ name: 'Parameters', type: 'js' }"
          v-model="command.operation_params"
          @change="previewed = false"
        />
      </div>
    </div>
    <v-btn class="mui-btn mui-btn--primary" @click="preview">预览</v-btn>
    <v-btn  :disabled="!previewed" @click="execute">运行</v-btn>
    <div class="mui-panel">
      <pre>{{ preview_text }}</pre>
    </div>
  </div>
</template>

<script>
import api from "../api";
import ParamInput from "./ParamInput";

export default {
  name: "DbConsole",
  components: { ParamInput },
  data() {
    return {
      mongocollections: [],
      command: {
        mongocollection: "paragraph",
        query: "",
        operation: "count",
        operation_params: "",
        preview: true,
      },
      previewed: false,
      preview_text: "",
    };
  },
  computed: {
    mongocollectionsstr() {
      return this.mongocollections.join("|");
    },
  },
  methods: {
    preview() {
      this.command.preview = true;
      api.call("admin/db", this.command).then((data) => {
        data = data.result
        this.preview_text =
          "MongoCollection(\"" +
          data.mongocollection +
          "\").query(" +
          JSON.stringify(data.query, '', 2) +
          ")." +
          data.operation +
          "(" +
          JSON.stringify(data.operation_params, '', 2) +
          ")";
        this.previewed = true
      });
    },
    execute() {
      this.command.preview = false;
      api.call("admin/db", this.command).then((data) => {
        this.preview_text += '\n\n' + JSON.stringify(data.result, '', 2)
      });
    },
  },
  mounted() {
    api
      .call("admin/db/collections")
      .then((data) => (this.mongocollections = data.result));
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
</style>
