// const HOST = 'http://172.24.129.6:8370'
const HOST = 'http://localhost:8370'
module.exports = {
  devServer: {
    host: '0.0.0.0',
    proxy: {
      '^/api/socket': {
        target: HOST,
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/api': {
        target: HOST,
        secure: false,
        changeOrigin: true
      }
    }
  }
}