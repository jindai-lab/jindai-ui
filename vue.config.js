module.exports = {
  devServer: {
    host: '0.0.0.0',
    proxy: {
<<<<<<< HEAD
      '^/api/socket': {
=======
      '/api/socket': {
>>>>>>> b836305b3420f61a3ce7738a18f4d0db84cc91a9
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