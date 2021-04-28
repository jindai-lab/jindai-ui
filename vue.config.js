module.exports = {
  devServer: {
    host: '172.24.128.1',
    proxy: {
        '/api': {
            target: 'http://172.24.1.2:8370',
            secure: false,
            changeOrigin: true
        }
    }
  }
}