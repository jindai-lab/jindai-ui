<template>
<div>
<h3>文献集</h3>
<div v-for="(coll, index) in collections" :key="coll[0]" class="mui-row">
    <div class="opers mui-col-md-2">
          <button @click="move(index, -1)" :disabled="index == 0" class="mui-btn">
            <i class="fa fa-arrow-up"></i>
          </button>
          <button
            @click="move(index, 1)"
            :disabled="index == collections.length - 1"
            class="mui-btn"
          >
            <i class="fa fa-arrow-down"></i>
          </button>
        </div>
        <label class="mui-col-md-2">{{ coll[0] }}</label>
    <ParamInput class="mui-col-md-8" :arg="{name: '名称', type: ''}" v-model="coll[1]" @validation="update_valid(coll[0], $event)" />
    
</div>
    <button @click="save" class="mui-btn mui-btn--primary"><i class="fa fa-check"></i> 保存</button>
</div>
</template>

<script>
import ParamInput from './ParamInput'
import api from '../api'

export default {
    name: 'CollectionList',
    components: {
        ParamInput
    },
    data () {
        return {
            collections: [],
            valid: []
        }
    },
    mounted () {
        api.call('meta').then(resp => {
            this.collections = resp.data.result.collections
            api.call('quicktask', {q: '??group(_id=$collection)', raw: true}).then(
                resp => {
                    var colls = this.collections.map(x => x[0])
                    for (var coll of resp.data.result) {
                        if (colls.indexOf(coll._id) < 0) this.collections.push([coll._id, coll._id])
                    }
                }
            )
        })
    },
    methods: {
        update_valid(name, val){
            this.valid = this.valid.filter(x => x != name)
            if (!val) this.valid.push(name)
        },
        save () {
            if (this.valid.length > 0) {
                alert('请更正填写错误的项')
                return
            }
            api.call('meta', {collections: this.collections})
            alert('保存成功')
        },
        move (index, inc) {
            var c = this.collections[index]
            this.collections.splice(index, 1)
            this.collections.splice(index + inc, 0, c)
        }
    }
}
</script>

<style scoped>
label {
    font-size: 20px;
    text-align: right;
    vertical-align: baseline;
    line-height: 64px;
}
[disabled] {
    opacity: 0;
}
</style>