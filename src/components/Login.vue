<template>
<v-card flat>
    <v-card-title>登录</v-card-title>
    <v-card-text>
    <v-text-field v-model="username" label="用户名"></v-text-field>
    <v-text-field v-model="password" type="password" label="密码"></v-text-field>
    </v-card-text>
    <v-card-actions>
        <v-btn @click="login">登录</v-btn>
        <v-spacer></v-spacer>
        <v-checkbox v-model="remember" label="记住我"></v-checkbox>
    </v-card-actions>
</v-card>
</template>

<script>
import api from '../api'

export default {
    name: 'Login',
    data () {
        return {
            username: '',
            password: '',
            remember: true
        }
    },
    methods: {
        login() {
            api.auth(this.username, this.password, this.remember).then(() => {
                this.$emit('logined')
                this.$router.push('/')
            })
        }
    },
}
</script>

