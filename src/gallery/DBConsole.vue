<template>
  <v-card>
    <v-card-title>
      <v-row>
        <v-btn class="close" icon @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        DB Console
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-select
        label="Mongo Collection"
        :items="mongocollections"
        v-model="command.collection"
        @change="previewed = false"
      ></v-select>
      <v-select
        label="Operation"
        :items="['count', 'update_many', 'delete_many']"
        v-model="command.operation"
        @change="previewed = false"
      ></v-select>
      <v-textarea
        hint="parameters"
        v-model="command.params"
        @change="previewed = false"
      ></v-textarea>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="preview">Preview</v-btn>
      <v-btn :disabled="!previewed" @click="execute">Execute</v-btn>
    </v-card-actions>
      <v-card-text>
        <pre>{{ preview_text }}</pre>
      </v-card-text>
  </v-card>
</template>

<script>
import api from "./api";

export default {
  name: "DbConsole",
  data() {
    return {
      mongocollections: [],
      command: {
        collection: "post",
        operation: "count",
        params: "",
        preview: true,
      },
      previewed: false,
      preview_text: "",
    };
  },
  methods: {
    preview() {
      this.command.preview = true;
      api.call("dbconsole", this.command).then((data) => {
        this.preview_text = data.result;
        this.previewed = true;
      });
    },
    execute() {
      api
        .call("dbconsole", Object.assign({}, this.command, { preview: false }))
        .then((data) => {
          this.preview_text += "\n\n" + JSON.stringify(data.result, "", 2);
        });
    },
  },
  mounted() {
    api.call("dbconsole").then((data) => (this.mongocollections = data.result));
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
