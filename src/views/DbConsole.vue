<template>
  <v-card flat>
    <v-card-title>
      {{ $t("console") }}
    </v-card-title>
    <v-card-text>
      <v-select label="Mongo Collection" :items="mongocollections" v-model="command.mongocollection"
        @change="previewed = command.operation == 'count_documents'"></v-select>
      <ParamInput :arg="{ name: 'Query', type: 'QUERY', description:'', default:'' }" v-model="command.query"
        @input="previewed = command.operation == 'count_documents'" />
      <ParamInput :arg="{ name: 'Operation', type: 'update_many|delete_many|count_documents', description:'', default:'' }"
        v-model="command.operation" @input="previewed = command.operation == 'count_documents'" />
      <ParamInput :arg="{ name: 'Parameters', type: 'QUERY', description:'', default:'' }" v-model="command.operation_params"
        @input="previewed = command.operation == 'count_documents'" v-show="command.operation != 'count_documents'" />
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

<script lang="ts">

import { call } from "@/api/net";
import ParamInput from "../components/ParamInput.vue";

import localConfig from "@/api/localConfig";
import { defineComponent, Ref, ref } from "vue";

type DbConsoleRequest = {
  mongocollection: string,
  query: object,
  operation: string,
  operation_params: object
}

const history = ref(localConfig.dbconsole.history) as Ref<DbConsoleRequest[]>

export default defineComponent({
  name: "DbConsole",
  components: { ParamInput },
  data() {
    return {
      mongocollections: [localConfig.dbconsole.mongocollection || "paragraph"],
      command: {
        mongocollection: localConfig.dbconsole.mongocollection || "paragraph",
        query: "",
        operation: "count_documents",
        operation_params: "",
        preview: true,
      },
      previewed: false,
      preview_text: "",
      config: localConfig
    };
  },
  methods: {
    get_command() {
      return Object.assign({}, this.command, {
        operation_params:
          this.command.operation == "count_documents" ? "" : this.command.operation_params,
      });
    },
    stringify_command(data: DbConsoleRequest) {
      return 'MongoCollection("' +
        data.mongocollection +
        '").query(' +
        JSON.stringify(data.query, undefined, 2) +
        ")." +
        data.operation +
        "(" +
        JSON.stringify(data.operation_params, undefined, 2) +
        ")";
    },
    preview() {
      this.command.preview = true;
      call<DbConsoleRequest>("admin/db", "post", this.get_command()).then((data) => {
        this.preview_text = this.stringify_command(data)
        this.previewed = true;
      });
    },
    execute() {
      this.command.preview = false;
      localConfig.dbconsole.mongocollection = this.command.mongocollection;
      history.value.splice(0, 0, Object.assign({} as Partial<DbConsoleRequest>, this.command));
      if (history.value.length > 10) history.value.splice(10, history.value.length - 10)
      localConfig.save();
      call("admin/db", 'post', this.get_command()).then((data) => {
        this.preview_text += "\n\n" + JSON.stringify(data, undefined, 2);
      });
    },
    replay(h: DbConsoleRequest) {
      Object.assign(this.command, h);
      this.execute();
    }
  },
  mounted() {
    call<string[]>("admin/db/collections")
      .then((data) => (this.mongocollections = data));
  },
})
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
