<template>
  <div>
    <div id="blocklyDiv" class="blocklyDiv" ref="blocklyDiv"></div>
    <xml ref="blocklyToolbox" style="display: none"></xml>
    <div class="options">
      <v-btn color="primary" @click="save">{{ $t("save") }}</v-btn>
      <v-btn class="ml-5" @click="$emit('cancel')">{{ $t("cancel") }}</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import Blockly from "blockly";

export default  {
  name: "BlocklyComponent",
  props: ["json", "pipelines", "tasks"],
  data() {
    return {
      workspace: null,
      blocks_dict: {},
    };
  },
  mounted() {
    var interval = setInterval(() => {
      if (
        !this.pipelines ||
        !this.json ||
        !this.tasks.length ||
        !this.$refs.blocklyDiv
      )
        return;

      var options = {
        media: "media/",
        toolbox: this.load_toolbox(),
      };
      console.log(options.toolbox);

      this.workspace = Blockly.inject(this.$refs.blocklyDiv, options);
      this.workspace.clear();
      var xml = document.createElement("xml");
      this.to_xml(xml, this.json);
      console.log(xml);
      Blockly.Xml.domToWorkspace(xml, this.workspace);
      clearInterval(interval);
    }, 1000);
  },
  methods: {
    auto_parse(val: string | number | object) {
      if (typeof val !== "string") return val;
      if (val === "FALSE" || val === "TRUE") return val === "TRUE";
      if (val.match(/^[+-]?\d+\.?\d*[Ee]?[+-]?\d*$/)) return +val;
      return val;
    },
    load_toolbox() {
      var toolbox = {
        kind: "categoryToolbox",
        contents: [],
      };

      toolbox.contents.push({
        kind: "category",
        name: "过程处理",
        contents: [],
      });
      for (var group in this.pipelines) {
        toolbox.contents.push({
          kind: "category",
          name: group,
          colour: 160,
          contents: [],
        });
        let toolbox_contents = toolbox.contents.slice(-1)[0].contents;
        let items = this.pipelines[group];
        for (var item_key in items) {
          let item = items[item_key];
          let obj = {
            previousStatement: null,
            nextStatement: null,
            colour: 160,
            message0: `${item.name} ${item.doc}`,
          };
          this.blocks_dict[item.name] = item;
          for (var i = 0; i < item.args.length; ++i) {
            let arg = item.args[i];
            arg.description = arg.description || arg.name;
            obj[`message${i + 1}`] = arg.description.includes("%1")
              ? arg.description
              : `${arg.description}：%1`;
            obj[`args${i + 1}`] = [
              arg.type.includes("|")
                ? {
                    type: "field_dropdown",
                    name: arg.name,
                    options: arg.type
                      .split("|")
                      .map((x) => (x.includes(":") ? x.split(":") : [x, x])),
                  }
                : ["float", "int"].includes(arg.type)
                ? {
                    type: "field_number",
                    name: arg.name,
                  }
                : "bool" == arg.type
                ? {
                    type: "field_checkbox",
                    name: arg.name,
                  }
                : "TASK" == arg.type
                ? {
                    type: "field_dropdown",
                    name: arg.name,
                    options: this.tasks.map((x) => [x.name, x._id]),
                  }
                : "pipeline" == arg.type
                ? {
                    type: "input_statement",
                    name: arg.name,
                  }
                : {
                    type: "input_value",
                    name: arg.name,
                  },
            ];
          }
          Blockly.Blocks[item.name] = {
            init() {
              this.jsonInit(obj);
            },
          };
          toolbox_contents.push({
            kind: "block",
            type: item.name,
          });
        }
      }

      toolbox.contents.push({
        kind: "category",
        name: "常量",
        contents: [
          { kind: "block", type: "text" },
          { kind: "block", type: "text_multiline" },
          { kind: "block", type: "math_number" },
        ],
      });

      var query_blocks = [
        {
          type: "function_size",
          name: "数组长度",
          message0: "数组 %1 的长度",
          args0: [
            {
              type: "input_value",
              name: "VALUE",
            },
          ],
          output: "Number",
          colour: 160,
          tooltip: "Returns number of array element.",
        },
        {
          type: "function_strlenCP",
          name: "字符串长度",
          message0: "字符串 %1 的长度",
          args0: [
            {
              type: "input_value",
              name: "VALUE",
            },
          ],
          output: "Number",
          colour: 160,
          tooltip: "Returns number of letters in the provided text.",
        },
      ];

      const constants = Object.entries({
        'file-source': "source__file",
        'url-source': "source__url",
        'file-pagenum': "source__page",
        'pagenum': "pagenum",
        'pdate': "pdate",
        'keywords': "keywords",
        'content': "content",
        'lang': "lang",
        'dataset': "dataset",
        'outline': "outline",
        'images': "images",
      });

      toolbox.contents.push({
        kind: "category",
        name: this.$t('query'),
        contents: [
          {
            kind: "block",
            type: "logic_compare",
          },
          {
            kind: "block",
            type: "logic_operation",
          },
          {
            kind: "block",
            type: "logic_boolean",
          },
          ...constants.map((cst) => {
            var item = {
              kind: "block",
              type: `constant_${cst[1]}`,
              name: cst[0],
              message0: cst[0],
              args0: [],
              output: "String",
              color: 160,
            };
            Blockly.Blocks[item.type] = {
              init() {
                this.jsonInit(item);
              },
            };
            return { kind: "block", type: item.type };
          }),
          ...query_blocks.map((item) => {
            Blockly.Blocks[item.type] = {
              init() {
                this.jsonInit(item);
              },
            };
            return { kind: "block", type: item.type };
          }),
        ],
      });
      return toolbox;
    },
    to_xml(parent: HTMLElement, tuples: [string, object][]) {
      var index = 0;

      for (var tup of tuples) {
        if (index > 0) {
          var next = document.createElement("next");
          parent.appendChild(next);
          parent = next;
        }

        let [name, args] = tup
        var block = document.createElement("block");
        block.setAttribute("type", name);
        if (!this.blocks_dict[name]) {
          console.log("?unknown block", name);
          continue;
        }
        for (var argname in args) {
          let argvalue = args[argname],
            arg = this.blocks_dict[name].args.filter(
              (x) => x.name == argname
            )[0];
          if (!arg) {
            console.log("?arg", argname);
            continue;
          }
          let argtype = arg.type;
          var field : HTMLElement;
          if (
            ["bool", "float", "int", "TASK"].includes(argtype) ||
            argtype.includes("|")
          ) {
            field = document.createElement("field");
            field.setAttribute("name", argname);
            argvalue = "" + argvalue;
            if (argtype == "bool") argvalue = argvalue.toUpperCase();
            field.innerHTML = argvalue;
            block.appendChild(field);
          } else if (argtype == "pipeline") {
            field = document.createElement("statement");
            field.setAttribute("name", argname);
            this.to_xml(field, argvalue);
            block.appendChild(field);
          } else {
            var valuenode = document.createElement("value");
            valuenode.setAttribute("name", argname);
            var valueblock = document.createElement("block");
            valueblock.setAttribute(
              "type",
              (argvalue || "").includes("\n") ? "text_multiline" : "text"
            );
            var valueblockfield = document.createElement("field");
            valueblockfield.setAttribute("name", "TEXT");
            valueblockfield.innerHTML = argvalue;
            valueblock.appendChild(valueblockfield);
            valuenode.appendChild(valueblock);
            block.appendChild(valuenode);
          }
        }

        parent.append(block);
        parent = block;
        ++index;
      }
    },
    from_field_expr(block?: Element) {
      var op = "";
      if (!block) return ''
      let block_type = block.getAttribute("type") || '';
      switch (block_type) {
        case "math_number":
        case "text":
        case "text_multiline":
          return this.auto_parse(
            block.getElementsByTagName("field")[0].innerHTML
          );
        case "logic_compare":
          op = block.querySelector('field[name="OP"]')?.textContent || '';
          return (
            this.from_field_expr(block.querySelector("[name=A]")) +
            {
              EQ: "=",
              LT: "<",
              LE: "<=",
              GT: ">",
              GE: ">=",
              NE: "!=",
            }[op] +
            this.from_field_expr(block.querySelector("[name=B]"))
          );
        default:
          if (block_type.startsWith("constant_"))
            return block_type.split("_", 2)[1].replace(/__/g, ".");
          if (block_type.startsWith("function_"))
            return (
              block_type.split("_", 2)[1] +
              "(" +
              this.from_field_expr(block.querySelector("[name=VALUE]")) +
              ")"
            );
          break;
      }
      return "";
    },
    from_xml(block: Element) {
      var j = [];
      while (block) {
        // iterative through 'next' tags to get a sequence of blocks
        var next = null,
          obj = {
            name: block.getAttribute("type"),
            args: {},
          };
        for (var child of block.children) {
          switch (child.tagName) {
            case "next":
              next = child.children[0];
              break;
            case "field":
            case "value":
              obj.args[child.getAttribute("name")] = this.from_field_expr(
                child.children[0]
              );
              break;
            case "statement":
              obj.args[child.getAttribute("name")] = this.from_xml(
                child.children[0]
              );
              break;
          }
        }
        j.push([obj.name, obj.args]);
        block = next;
      }
      return j;
    },
    save() {
      var xml = Blockly.Xml.workspaceToDom(this.workspace);
      if (!xml.children.length) return;

      var block = xml.children[0];
      var j = this.from_xml(block);

      console.log(j);

      this.$emit("save", j);
    },
  },
};
</script>

<style scoped>
.blocklyDiv {
  height: 100%;
  width: 100%;
  text-align: left;
  background: white;
  color: black;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 200;
}

.options {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 200;
}
</style>
