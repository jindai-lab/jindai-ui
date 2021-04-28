<template>
<div id="searchForm">
  <img alt="jindai logo" src="../assets/logo.png">
  <div id="selectors">
    <select name="collection" id="collection" v-bind="selected_collection">
    <option value="">(全部)</option>
    <option v-for="coll in collections" :value="coll.id" :key="coll.id">{{ coll.name }}</option>
    </select>
    <select name="pdffile" id="pdffile" v-bind="selected_pdffile">
    <option value="">(全部)</option>
    <option v-for="pdffile in pdffiles" :value="pdffile" :key="pdffile">{{ pdffile }}</option>
    </select>
    <select name="sort" id="sort">
    <option value="">默认</option>
    <option value="year">从旧到新</option>
    <option value="-year">从新到旧</option>
    <option value="pdffile,pdfpage">出处</option>
    </select>
  </div>
  <div id="search">
    <input type="text" v-model="q">
  </div>
  <div id="multiselect">
    <span v-for="coll in collections" :key="coll.id">
    <input type="checkbox" :id="'collection_check_' + coll.id" name="collections" :value="coll.id">
    <label :for="'collection_check_' + coll.id">{{ coll.name }}</label>
    </span>
  </div>
  <button id="search">查询</button>
  <ul>
    <li v-for="r in results" :key="r.id">
      <span>{{ r.id }}</span>
      <p>{{ r.content }}</p>
    </li>
  </ul>
</div>
</template>
    
<script>
import axios from 'axios'
const apiBase = 'api/'

export default {
  name: 'searchForm',
  components: {
    
  },
  data () {
    return {
      collections: [],
      pdffiles: [],
      results: [],
      selected_collection: '',
      selected_pdffile: '',
      q: ''
    }
  },
  mounted () {
    axios.post(apiBase + 'quicktask', { q: '??group(_id=(pdffile=`$pdffile`, coll=$collection))' }).then(
      (data) => {
        this.collections = data.map(x => { return {id: x, collection: x} })
      }
    )
  }
}
</script>
