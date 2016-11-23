var path = require('path')
var webpack = require('webpack')
var commonConfig = {
  cache: true,
  entry: {
    performance:'./src/index'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].min.js',
    publicPath: '',
    libraryTarget: 'umd',
    library:'llsWebPerformance'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  module: {
    loaders: [
      {
        test: /\.js|\.jsx$/,
        loaders: ['babel'],
        exclude: /node_modules/
      }
    ]
  }
};


module.exports = commonConfig