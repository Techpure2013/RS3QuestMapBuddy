const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  entry: "./src/Entrance/index.tsx", // Entry point for your application
  output: {
    filename: "js/[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/RS3QuestBuddy/", // Required for `webpack-dev-server`
  },
  mode: "development", // Use 'production' for a production build
  externals: ["sharp", "canvas", "electron/common"],
  resolve: {
    extensions: [".wasm", ".tsx", ".ts", ".mjs", ".jsx", ".js"],
    modules: [path.resolve("./node_modules"), path.resolve("./src")],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Match .ts and .tsx files
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // For handling CSS files
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.data\.png$/,
        loader: "alt1/imagedata-loader",
        type: "javascript/auto",
      },
      {
        test: /\.fontmeta.json/,
        loader: "alt1/font-loader",
      },
      {
        test: /\.(png|jpe?g|gif|webp|svg)$/i, // Handle standard image files
        type: "asset/resource", // Use Webpack 5's built-in asset handling
        generator: {
          filename: "Assets/Images/[name][ext]", // Preserve file names and output to 'images' folder
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/Entrance/index.html",
      filename: "index.html",
      inject: true,
    }),
    // --- 2. ADD THE PLUGIN CONFIGURATION HERE ---
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public"), // Source: your public folder
          to: path.resolve(__dirname, "dist"), // Destination: your build folder
        },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"), // Serve files from the 'dist' folder
    },

    port: 3000, // Development server port
    open: true, // Automatically open the browser
    hot: false, // Enable hot module replacement
    historyApiFallback: true,
    liveReload: false, // Disable Live Reloading
  },
};
