module.exports = {
  devServer: {
    host: '127.0.0.1',
    proxy: {
        '/api': {
            target: 'http://172.24.1.2:8370',
            secure: false,
            changeOrigin: true
        }
    }
  }
}