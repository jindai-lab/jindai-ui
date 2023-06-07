<template>
  <div>
    <v-autocomplete
      v-if="type_choices"
      :label="arg.name"
      :value="
        value === null || typeof value === 'undefined' ? arg.default : value
      "
      v-bind="$attrs"
      v-on="inputListeners"
      @change="inputListeners.input"
      :items="type_choices"
    >
    </v-autocomplete>

    <v-autocomplete
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      @change="inputListeners.input"
      :items="choices"
      :hint="(choices.filter((x) => x.value == value)[0] || {}).hint"
      persistent-hint
      item-value="value"
      item-text="text"
      v-else-if="arg.type == 'TASK' || arg.type == 'PIPELINE'"
    >
    </v-autocomplete>

    <v-combobox
      v-else-if="arg.type == 'DATASET'"
      :items="choices"
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      item-value="value"
      item-text="text"
      @change="inputListeners.input"
    >
    </v-combobox>

    <div v-else-if="arg.type == 'object'">
      <v-row v-for="(r, i) in keys" :key="r.name">
        <v-col>
          <v-text-field
            v-model="r.name"
            @input="update_object_value"
          ></v-text-field>
        </v-col>
        <v-col>
          <v-select
            :items="['str', 'int', 'float', 'bool']"
            v-model="r.type"
            @input="update_object_value"
          ></v-select>
        </v-col>
        <v-col>
          <ParamInput
            :arg="r"
            v-model="object_value[r.name]"
            @input="update_object_value"
          />
        </v-col>
        <v-col>
          <v-btn
            icon
            @click="
              keys.splice(i, 1);
              update_object_value();
            "
          >
            <v-icon>mdi-minus</v-icon>
          </v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-btn icon @click="keys.push({ name: '', type: 'str' })">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-row>
    </div>

    <div v-else-if="arg.type == 'bool'">
      <v-simple-checkbox
        :value="value"
        class="d-inline-block"
        ref="checkbox"
        v-bind="$attrs"
        v-on="inputListeners"
      >
      </v-simple-checkbox
      ><label @click="() => $refs.checkbox.click()">{{ arg.name }}</label>
    </div>

    <div v-else-if="arg.type == 'QUERY'">
      <label>{{ arg.name }}</label>
      <prism-editor
        class="my-editor match-braces"
        v-model="code"
        @input="$emit('input', code)"
        :highlight="highlighter"
        line-numbers
        @keyup.ctrl.enter="$emit('submit')"
      />
    </div>

    <div v-else-if="arg.type == 'LINES'">
      <label>{{ arg.name }}</label>
      <v-data-table
        :headers="[
          { text: 'Actions', align: 'end', value: 'actions', sortable: false },
          { text: '', align: 'start', sortable: false, value: 'text' },
        ]"
        class="lines-editor"
        :items="lines"
        :items-per-page="-1"
        hide-default-header
        hide-default-footer
        @dblclick:row="edit_line"
      >
        <template v-slot:item.actions="{ item }">
          <v-icon small class="mr-2" @click="edit_line(item.index)">
            mdi-pencil
          </v-icon>
          <v-icon small @click="delete_line(item.index)"> mdi-delete </v-icon>
          <v-icon
            small
            @click="move_line(item.index, -1)"
            v-if="item.index > 0"
          >
            mdi-arrow-up
          </v-icon>
          <v-icon
            small
            @click="move_line(item.index, 1)"
            v-if="item.index < lines.length - 1"
          >
            mdi-arrow-down
          </v-icon>
        </template>
        <template v-slot:body.append>
          <tr>
            <td></td>
            <td>
              <v-text-field
                type="text"
                label=""
                v-model="new_line"
                ref="new_line_input"
                @keyup.enter="append_line()"
                @blur="append_line()"
              ></v-text-field>
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>

    <v-textarea
      v-else-if="arg.type == 'str' || arg.type == 'string'"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :hint="arg.default"
      :required="!arg.default"
      :rows="(value || '').includes('\n') ? 4 : 1"
      cols="40"
      :label="arg.name"
      @keyup.ctrl.enter="$emit('submit')"
    ></v-textarea>

    <div
      v-else-if="arg.type.startsWith('file')"
      @drop.prevent="drop_file"
      @dragover.prevent
      @click="$refs.input_file.click()"
      class="file-drop"
    >
      {{ file_prompt }}
      <input
        type="file"
        @change="drop_file({ dataTransfer: { files: $event.target.files } })"
        :accept="
          arg.type
            .substr(5)
            .split(',')
            .map((x) => `.${x}`)
            .join(', ')
        "
        ref="input_file"
      />
    </div>

    <v-text-field
      v-else
      type="text"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :placeholder="arg.default"
      :required="!arg.default"
      :label="arg.name"
      @keyup.ctrl.enter="$emit('submit')"
    >
    </v-text-field>

    {{ prompt }}
  </div>
</template>

<script>
function input_func(vm) {
  return function (event) {
    var val = vm.validate(event);
    if (typeof val !== "undefined") {
      vm.prompt = "";
    } else {
      val = null;
    }
    if (val && typeof val.value !== "undefined") val = val.value;
    vm.$emit("validation", vm.prompt === "");
    vm.$emit("input", val);
  };
}

import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

export default {
  name: "ParamInput",
  inheritAttrs: false,
  props: ["value", "arg"],
  events: ["validation"],
  components: {
    PrismEditor,
  },
  computed: {
    inputListeners: function () {
      const vm = this;
      return Object.assign({}, this.$listeners, {
        input: input_func(vm),
      });
    },
    type_choices() {
      function _expand_choices(x) {
        return x
          .split("|")
          .map((x) => (x.includes(":") ? x.split(":") : [x, x]))
          .map((x) => ({ text: x[0], value: x[1] }));
      }

      switch (this.arg.type) {
        case "LANG":
          return _expand_choices(this.langs);
        default:
          if (this.arg.type.includes("|")) {
            return _expand_choices(this.arg.type);
          }
          var doc_choose = (this.arg.description || "").match(
            /@choose\((.*?)\)/
          );
          if (doc_choose) {
            return _expand_choices(doc_choose[1]);
          }
          return false;
      }
    },
    lines() {
      return (this.value || "")
        .split("\n")
        .filter((x) => x.length)
        .map((x, i) => ({ text: x, index: i }));
    },
  },
  data() {
    return {
      prompt: "",
      code: "",
      choices: [],
      file_prompt: this.$t("drop-in-files"),
      langs: this.$t("langs"),
      object_value: {},
      keys: [],
      new_line: "",
    };
  },
  watch: {
    arg() {
      this.update_choices();
    },
    value(val) {
      if (this.code != val) this.code = val;
    }
  },
  methods: {
    validate(val) {
      if (val === "") {
        if (
          typeof this.arg.default === "undefined" ||
          this.arg.default === null
        ) {
          this.prompt = this.$t("required");
          return;
        }
        return null;
      }
      switch (this.arg.type) {
        case "bool":
          return val;
        case "int":
          if (val.match(/^[+-]?\d+$/)) return parseInt(val);
          break;
        case "float":
        case "number":
          if (val.match(/^[+-]?\d?\.?\d+[eE]?[+-]?\d*$/))
            return parseFloat(val);
          break;
        default:
          return val;
      }
      this.prompt = this.$t("match-type", { type: this.arg.type });
      return;
    },
    highlighter(code) {
      return highlight(code, languages.clike); // languages.<insert language> to return html with markup
    },
    update_object_value() {
      if (this.arg.type !== "object") return;
      var val = {};
      for (var k of this.keys) {
        val[k.name] = this.object_value[k.name];
      }
      this.$emit("input", val);
    },
    refresh(val) {
      if (!val) val = this.value;
      this.code = val;
      this.$emit("input", val);
    },
    update_choices() {
      switch (this.arg.type) {
        case "TASK":
        case "DATASET":
          this.api.call(this.arg.type.toLowerCase() + "s").then(
            (data) =>
              (this.choices = data.result.map((x) => ({
                text: x.display_name || x.name,
                value: this.arg.type == "TASK" ? x._id : x.name,
              })))
          );
          break;
        case "PIPELINE":
          this.choices = [].concat(
            ...Object.values(this.business.pipelines).map((x) =>
              Object.keys(x).map((k) => ({
                text: `${x[k].doc} ${k}`,
                value: k,
                hint: x[k].args
                  .map(
                    (x) =>
                      `${x.name} (${x.type}${
                        x.default !== null ? " optional" : ""
                      })`
                  )
                  .join(", "),
              }))
            )
          );
          break;
        case "LANG":
          for (var pair of Object.entries(this.business.languages)) {
            let key = pair[0],
              val = pair[1];
            if (this.langs.indexOf(`:${key}`) >= 0) continue;
            this.langs += `|${val}:${key}`;
          }
          break;
        case "object":
          this.keys = this.arg.keys || [];
      }
    },
    drop_file(e) {
      let types = this.arg.type.substr(5).split(",");
      let types_check = new RegExp("\\.(" + types.join("|") + ")$", "i");
      let droppedFiles = Array.from(e.dataTransfer.files).filter((x) =>
        x.name.match(types_check)
      );
      if (!droppedFiles.length) {
        this.$notify(this.$t("match-file-type", { type: types.join(", ") }));
        return;
      }
      let file = droppedFiles[0];
      var reader = new FileReader();
      reader.onload = (e) => {
        this.$emit("input", e.target.result);
        this.file_prompt = file.name;
      };
      reader.onerror = (e) => console.log("Error : " + e.type);
      reader.readAsDataURL(file);
    },
    move_line(item_id, inc) {
      var lines = this.lines.map((x) => x.text);
      var deleted = lines.splice(item_id, 1);
      switch (inc) {
        case -1:
          lines.splice(item_id - 1, 0, deleted);
          break;
        case 1:
          lines.splice(item_id + 1, 0, deleted);
          break;
        default:
          break;
      }
      this.$emit("input", lines.join("\n"));
      return deleted[0];
    },
    delete_line(item_id) {
      return this.move_line(item_id, 0);
    },
    append_line() {
      if (this.new_line)
        this.$emit("input", ((this.value || "") + "\n" + this.new_line).trim());
      this.new_line = "";
    },
    edit_line(item_id, row) {
      if (typeof row == "object") item_id = row.item.index;
      this.new_line = this.delete_line(item_id);
      this.$refs.new_line_input.focus();
    },
  },
  mounted() {
    this.code = this.value;
    this.update_choices();
  },
};
</script>

<style scoped>
blockquote {
  color: red;
}

/* required class */
.my-editor {
  /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
  background: #2d2d2d;
  color: #ccc;

  /* you must provide font-family font-size line-height. Example: */
  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
  outline: none;
}

.file-drop {
  border: 1px dashed dodgerblue;
  max-width: 200px;
  padding: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.lines-editor td:nth-child(1) {
  width: 50px;
}
</style>
