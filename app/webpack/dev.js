//本地开发启动server
const express =require('express');
const path =require('path');
const consoler=require('consoler');
const webapck =require('webpack');
const devMiddleware=require('webpack-dev-middleware');
const hotMiddleware=require('webpack-hot-middleware');

const app=express();
//从webpack.dev.js获取webpack配置和devServer配置
const {
    webpackConfig,
    DEV_SERVER_CONFIG
} =require('./config/webpack.dev.js');

const compiler =webapck(webpackConfig);

//指定静态文件目录
app.use(express.static(path.join(__dirname,'../public/dist')));
//引用devMiddleware 中间件 （监控文件改动）
app.use(devMiddleware(compiler,{
    //落地文件
    writeToDisk: (filePath) => filePath.endsWith('.tpl'),
    //资源路径
    publicPath: webpackConfig.output.publicPath,
    //headers配置
    headers:{
        'Access-Control-Allow-Origin': '*',
        'Access-Control_Allow-Methods':'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Accesss-Control_Allow-Headers':'X_Request-With,content-type,Authorization'
    },
    stats:{
        color:true
    }
}));
//引用hotMiddleware 中间件 （实现热更新通讯）
app.use(hotMiddleware(compiler,{
    path:`/${DEV_SERVER_CONFIG.HMR_PATH}`,
    log:()=>{}
}))

consoler.info('请等待webpack初次构建完成提示')

//启动devServer
const port = DEV_SERVER_CONFIG.PORT;
app.listen(port,()=>{
    console.log(`app listening on port : ${port}`)
})

