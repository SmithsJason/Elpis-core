const webpack = require('webpack');
const webpackProdConfig = require('./config/webpack.prod.js');
console.log('\n[webpack] build start...\n');
webpack(webpackProdConfig, (err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  process.stdout.write(`${stats.toString({
    colors: true,//在控制台输出时，是否使用颜色区分不同级别的日志
    modules: false,//不显示每个模块的打包配置
    children: false,//不显示子模块的打包配置
    chunks: false,//不显示打包的chunks
    chunkModules: true,//显示代码块中的模块的信息
  })}\n`);
});