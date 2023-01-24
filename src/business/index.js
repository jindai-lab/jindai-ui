import initialized from './apicalls'
import Selection from './selection'
import Paging from "./paging"
import Vue from 'vue'

Vue.prototype.business = {Selection, Paging}

export default {Selection, Paging, initialized}