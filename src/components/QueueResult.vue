<template>
<div>
    <h3>任务结果 {{ id }}</h3>
    <ResultsView :value="results" />
    </div>
</template>

<script>
import api from '../api'
import ResultsView from './ResultsView'

export default {
    name: 'QueueResult',
    props: ['id'],
    components: { ResultsView },
    data () {
        return {
            results: []
        }
    },
    mounted () {
        api.call('queue/' + this.id).then(data =>
            this.results = data
        )
    }
}
</script>
