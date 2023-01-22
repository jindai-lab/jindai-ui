<template>
  <v-card flat>
    <v-card-title>
      {{ $t("console") }}
    </v-card-title>
    <v-card-text>
      <v-select
        label="Mongo Collection"
        :items="mongocollections"
        v-model="command.mongocollection"
        @change="previewed = command.operation == 'count'"
      ></v-select>
      <ParamInput
        :arg="{ name: 'Query', type: 'QUERY' }"
        v-model="command.query"
        @input="previewed = command.operation == 'count'"
      />
      <ParamInput
        :arg="{ name: 'Operation', type: 'update_many|delete_many|count' }"
        v-model="command.operation"
        @input="previewed = command.operation == 'count'"
      />
      <ParamInput
        :arg="{ name: 'Parameters', type: 'QUERY' }"
        v-model="command.operation_params"
        @input="previewed = command.operation == 'count'"
        v-show="command.operation != 'count'"
      />
    </v-card-text>
    <v-card-actions>
      <v-btn @click="preview">{{ $t("preview") }}</v-btn>
      <v-btn :disabled="!previewed" @click="execute">{{ $t("execute") }}</v-btn>
    </v-card-actions>
    <v-card-text>
      <pre>{{ preview_text }}</pre>
    </v-card-text>
    <v-card-text>
      {{ $t('history') }}
      <v-row v-for="(h, index) in config.dbconsole.history" :key="index">
        <v-col>{{ stringify_command(h) }}</v-col>
        <v-col><v-btn icon @click="replay(h)"><v-icon>mdi-replay</v-icon></v-btn></v-col>
      </v-row>
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
      mongocollections: [api.config.dbconsole.mongocollection || "paragraph"],
      command: {
        mongocollection: api.config.dbconsole.mongocollection || "paragraph",
        query: "",
        operation: "count",
        operation_params: "",
        preview: true,
      },
      previewed: false,
      preview_text: "",
      config: api.config
    };
  },
  methods: {
    get_command() {
      return Object.assign({}, this.command, {
        operation_params:
          this.command.operation == "count" ? "" : this.command.operation_params,
      });
    },
    stringify_command(data) {
      return 'MongoCollection("' +
        data.mongocollection +
        '").query(' +
        JSON.stringify(data.query, "", 2) +
        ")." +
        data.operation +
        "(" +
        JSON.stringify(data.operation_params, "", 2) +
        ")";
    },
    preview() {
      this.command.preview = true;
      api.call("admin/db", this.get_command()).then((data) => {
        data = data.result;
        this.preview_text = this.stringify_command(data)
        this.previewed = true;
      });
    },
    execute() {
      this.command.preview = false;
      api.config.dbconsole.mongocollection = this.command.mongocollection;
      if (!api.config.dbconsole.history) api.config.dbconsole.history = []
      api.config.dbconsole.history.splice(0, 0, Object.assign({}, this.command));
      if (api.config.dbconsole.history.length > 10) api.config.dbconsole.history = api.config.dbconsole.history.slice(0, 10)
      api.config.save();
      api.call("admin/db", this.get_command()).then((data) => {
        this.preview_text += "\n\n" + JSON.stringify(data.result, "", 2);
      });
    },
    replay(h) {
      this.command = Object.assign({}, h);
      this.execute();
    }
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
