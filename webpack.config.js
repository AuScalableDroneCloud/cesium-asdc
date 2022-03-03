const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: "./Apps/ASDC/Index.js",
  output: {
    path: path.resolve(__dirname, "build/Apps/ASDC"),
    filename: "bundle.[contenthash].js",

    // Needed to compile multiline strings in Cesium
    sourcePrefix: "",
  },
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./Apps/ASDC/index.template.html",
      inject: false,
    }),
    new CopyPlugin({
      patterns: [
        { from: "./Apps/Sandcastle", to: "../Sandcastle" },
        { from: "./Apps/SampleData", to: "../SampleData" },
        { from: "./Apps/TimelineDemo", to: "../TimelineDemo" },
        { from: "./Apps/ASDC/index.json", to: "./index.json" },
        { from: "./ThirdParty", to: "../../ThirdParty" },
        // { from: "./node_modules/cesium/Build", to: "../../Build" },
      ],
    }),
    new webpack.DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify("/cesium/Build/Cesium"),
    }),
  ],
};
