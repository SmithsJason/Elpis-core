//本地开发启动server
const merge = require('webpack-merge');
const path = require('path');
const webpack =require('webpack')

//基类配置
const baseConfig = require('./webpack.base.js');

const DEV_SERVER_CONFIG={
    HOST:'127.0.0.1',
    PORT:9002,
    HMR_PATH:'_webpack_hmr', //官方规定
    TIMEOUT:20000
};
//开发阶段的entry 配置需要加入hmr
Object.keys(baseConfig.entry).forEach( v=>{
    //第三方包不作为hmr入口
    if(v!=='vendor'){
        baseConfig.entry[v] = [
            //主入口文件
            baseConfig.entry[v],
            //hmr更新入口，官方指定的hmr路径
            `webpack-hot-middleware/client?path=http://${DEV_SERVER_CONFIG.HOST}:${DEV_SERVER_CONFIG.PORT}/${DEV_SERVER_CONFIG.HMR_PATH}&timeout=${DEV_SERVER_CONFIG.TIMEOUT}&reload=true`
        ]
    }
})
//本地环境配置
const webpackConfig = merge.smart(baseConfig, {
    //指定开发环境模式
    mode:'development',
    //source-map 呈现代码的映射关系，便于在开发过程中进行代码调试
    devtool: 'eval-cheap-module-source-map',
    //开发阶段 output 配置  
    output:{
        filename: 'js/[name]_[contenthash:8].bundle.js',
        path: path.resolve(process.cwd(), './app/public/dist/dev'),
        publicPath:`http://${DEV_SERVER_CONFIG.HOST}:${DEV_SERVER_CONFIG.PORT}/public/dist/dev`, 
        globalObject:'this',
        crossOriginLoading:'anonymous'
    },
    //开发阶段插件
    plugins:[
        //HotModuleReplacementPlugin 用于实现热模块替换（Hot Module Replacement 简称 HMR）
        //模块热替换允许应用程序运行时替换模块
        //极大的提升开发效率，因为能让应用程序一直保持运行状态
        new webpack.HotModuleReplacementPlugin({
            multiStep: false
        })
    ]
})
module.exports = {
    //webpack配置
    webpackConfig,
    //devServer配置，暴露给 dev.js使用
    DEV_SERVER_CONFIG
}
