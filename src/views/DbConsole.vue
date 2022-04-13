<template>
  <v-card flat>
    <v-card-title>
      数据库控制台
    </v-card-title>
    <v-card-text>
      <v-select
        label="Mongo Collection"
        :items="mongocollections"
        v-model="command.mongocollection"
        @change="previewed = false"
      ></v-select>
        <ParamInput
          ref="editor"
          :arg="{ name: 'Query', type: 'QUERY' }"
          v-model="command.query"
          @input="previewed = false"
        />
        <ParamInput
          :arg="{ name: 'Operation', type: 'update_many|delete_many|count' }"
          v-model="command.operation"
          @input="previewed = false"
        />
        <ParamInput
          ref="editor"
          :arg="{ name: 'Parameters', type: 'QUERY' }"
          v-model="command.operation_params"
          @input="previewed = false"
        />
    </v-card-text>
    <v-card-actions>
      <v-btn @click="preview">预览</v-btn>
      <v-btn :disabled="!previewed" @click="execute">执行</v-btn>
    </v-card-actions>
      <v-card-text>
        <pre>{{ preview_text }}</pre>
      </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";
import ParamInput from "../components/ParamInput";

export default {
  name: "DbConsole",
  components: { ParamInput },
  data() {
    return {
      mongocollections: ["paragraph"],
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
