// webpack.config.js
const path = require('path');

module.exports = {
  entry: './public/script.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 8080,
    https: true,
    historyApiFallback: true,
    proxy: {
      '/login': 'http://localhost:8080',
      '/callback': 'http://localhost:8080',
      '/refresh_token': 'http://localhost:8080'
    }
  }
};