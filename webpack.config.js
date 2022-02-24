const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./Apps/ASDC/Index.js",
  output: {
    path: path.resolve(__dirname, "build/Apps/ASDC"),
    filename: "bundle.[contenthash].js",
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
      ],
    }),
  ],
};
