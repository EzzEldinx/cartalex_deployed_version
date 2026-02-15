const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const HtmlWebPackPLugin = require('html-webpack-plugin');

let htmlPageNames = ['index', 'zotero']; 
let multipleHtmlPlugins = htmlPageNames.map(name => {
  return new HtmlWebPackPLugin({
    template: `./src/html/${name}.html`,
    filename: `${name}.html`,
    chunks: ['main'] // Desktop JS only
  })
});

module.exports = {
    entry: {
        main: './src/index.js',       // Desktop Entry
        mobile: './src/mobile_index.js' // Mobile Entry
    },
    output: {
        path: path.join(__dirname, 'dist'),
        publicPath: '/',
        filename: '[name].js'
    },
    target: 'web',
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: 'all', 
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: { loader: "babel-loader" }
            },
            {
                test: /\.html$/,
                use: [ { loader: "html-loader", options: {minimize: true} } ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },
    plugins: [
        new HtmlWebPackPLugin({
            template: './src/html/map.html',
            filename: './map.html',
            chunks: ['main']
        }),
        // NEW Mobile Page
        new HtmlWebPackPLugin({
            template: './src/html/mobile.html',
            filename: './mobile.html',
            chunks: ['mobile']
        })
    ].concat(multipleHtmlPlugins)
}