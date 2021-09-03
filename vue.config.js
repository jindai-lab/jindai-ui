module.exports = {
  devServer: {
    host: '0.0.0.0',
    proxy: {
      '/api/socket': {
        target: 'http://172.24.129.6:8370',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/api': {
        target: 'http://172.24.129.6:8370',
        secure: false,
        changeOrigin: true
      }
    }
  }
}