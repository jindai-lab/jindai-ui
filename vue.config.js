module.exports = {
  devServer: {
    host: '127.0.0.1',
    proxy: {
        '/api': {
            target: 'http://172.24.129.6:8370',
            secure: false,
            changeOrigin: true
        }
    }
  }
}