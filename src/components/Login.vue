<template>
    <div class="mui-panel">
        <div class="mui-form">
            <div class="mui-textfield">
                <label>用户名</label>
                <input type="text" v-model="username">
            </div>
            <div class="mui-textfield">
                <label>密码</label>
                <input type="password" v-model="password" @keyup.enter="login">
            </div>
            <button class="mui-btn mui-btn--primary" @click="login">登录</button>
            <button class="mui-btn" disabled>管理</button>
        </div>
    </div>
</template>

<script>
import api from '../api'

export default {
    name: 'Login',
    data () {
        return {
            username: '',
            password: ''
        }
    },
    methods: {
        login() {
            api.auth(this.username, this.password).then(() => {
                this.$emit('logined')
                this.$router.push('./')
            })
        }
    },
}
</script>
