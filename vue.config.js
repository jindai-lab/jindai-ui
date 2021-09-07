const HOST = 'http://172.24.129.6:8370'
// const HOST = 'http://localhost:8370'
module.exports = {
  devServer: {
    host: '172.24.128.1',
    proxy: {
      '/api': {
        target: HOST,
        secure: false,
        changeOrigin: true
      },
      '/api/socket/': {
        target: HOST,
        secure: false,
        changeOrigin: true,
        ws: true
      }
    }
  }
}
