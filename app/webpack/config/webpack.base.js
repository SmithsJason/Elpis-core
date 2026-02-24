const glob = require('glob');
const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
//动态构造pageEntries和htmlWebpackPluginList
const pageEntries={};
const htmlWebpackPluginList=[];
/**
 * 获取 app/pages 目录下所有页面入口文件(entry.xx.js)
 */
const entryList=path.resolve(process.cwd(), './app/pages/**/entry.*.js');
glob.sync(entryList).forEach(file => {
  const entryName = path.basename(file, '.js');
  //构造entry
  pageEntries[`entry.${entryName}`]=file;
  //构造最终渲染的页面文件
  htmlWebpackPluginList.push(
    //html-webpack-plugin辅助注入打包后的bundle文件到tpl文件中
    new HtmlWebpackPlugin({
    //产物（最终模版）的输出路径
    filename: path.resolve(process.cwd(), './app/public/dist/', `${entryName}.tpl`),
    //指定要使用的模版文件
    template:path.resolve(process.cwd(), './app/view/entry.tpl'),
    //要注入的代码块
    chunks: [`entry.${entryName}`],
  }));
});
/**
 * 基础webpack配置
 */
module.exports = {
  //入口配置
  entry: pageEntries,
  //模块解析配置（决定了要加载解析哪些模块，以及用什么方式去解析）
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader',
      },
      {
        test: /\.js$/,
        include: 
        // 只对业务代码进行 babel 编译, 加快 webpack 打包速度
        path.resolve(process.cwd(), './app/pages'),
        use: 'babel-loader',
      },
      {
        test: /\.(png|jpe?g|gif)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 300,
            esModule: false,
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader',
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
        use: ['file-loader'],
      },
    ],
  },
  //产物输出路径，因为开发和生产环境产物路径不同，所以需要分开自行配置
  output: { },
  //配置模块解析的具体行为（定义在webpack在打包时，如何找到并解析具体模块的路径）
  resolve: {
    extensions: ['.js', '.vue','.less','.css'],
    // 配置模块解析的别名
    alias: {
        $pages: path.resolve(process.cwd(), './app/pages'),
        $common: path.resolve(process.cwd(), './app/pages/common'),
        $widgets: path.resolve(process.cwd(), './app/pages/widgets'),
        $store: path.resolve(process.cwd(), './app/pages/store'),
    },
  },
  //插件配置（决定了在webpack打包过程中，要执行哪些特定的任务或功能）
  plugins: [
    //处理.vue文件，这个插件是必须的
    //它的职能是讲你定义过的其他规则复制并应用到.vue文件里
    //例如，有一条匹配规则 /\.js$/ 的规则，那么它会应用到 .vue文件中的<script>板块中
    new VueLoaderPlugin(),
    //把第三方库暴露到window.context下
    new webpack.ProvidePlugin({
        Vue:'vue',
        axios:'axios',
        _:'lodash'
    }) ,
    //定义全局常量
    new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),   // 支持 Options API
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false), // 生产环境关闭 DevTools
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),//禁用生产环境显示“水合”信息
    }),
    //构建最终渲染的页面模板
    ...htmlWebpackPluginList,
  ],
  //配置打包输出优化（配置代码分割、模块合并、缓存、TreeShaking，压缩等优化策略）
  optimization: {
    /**
    * 把js 文件打包成3种类型：
    * 1. vendors: 第三方 lib库，基本不回改动，除非依赖版本升级
    * 2. commons: 业务代码中公共的模块，如：utils、common、components等，改动较少
    * 3. entry.{page}:不用页面entry里的业务组件代码的差异部分，会经常改动
    * 目的：把改动和引用频率不一样的js区分出来，以达到更好利用浏览器缓存的效果
    */
    splitChunks: {
      chunks: 'all',//对同步和异步模块都进行分割
      maxAsyncRequests: 10,//最大异步请求数
      maxInitialRequests: 10,//最大初始请求数
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,//优先级
          enforce:true,//强制执行
          reuseExistingChunk:true,//复用已有的公共chunk
        },
        commons: {
          //公共模块
          name:'common',//模块名称
          minChunks: 2, //被两处引用即被视为公共模块
          minSize: 1, //最小分割文件大小（1 byte）
          priority: 10, //优先级
          reuseExistingChunk:true,//复用已有的公共chunk
        },
      },
    },
    //模块合并
    mergeDuplicateChunks: true,
    //缓存
    runtimeChunk: true,
    //TreeShaking
    usedExports: true,
    sideEffects: false,
  },
};