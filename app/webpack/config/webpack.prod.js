const merge = require('webpack-merge');
const path = require('path');
const os = require('os');
//happypack插件：将webpack的loader进行多线程处理，提高打包速度
const happypack = require('happypack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackInjectAttributesPlugin = require('html-webpack-inject-attributes-plugin');
//多线程 build 设置
const happypackCommonConfig = {
    debug: false,//关闭debug模式
    //线程池大小：根据CPU核心数设置
    threadPool: happypack.ThreadPool({
        size: Math.max(1, os.cpus().length),
    }),
};
//基类配置
const baseConfig = require('./webpack.base.js');

//生产环境配置
const webpackConfig = merge.smart(baseConfig, {
    //指定生产环境
    mode: 'production',
    //生产环境的 output 配置
    output:{
        filename: 'js/[name]_[contenthash:8].bundle.js',
        path: path.resolve(process.cwd(), './app/public/dist/prod'),
        publicPath:'/dist/prod',
        crossOriginLoading:'anonymous'
    },
    module: {
       rules: [
        {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'happypack/loader?id=css'],
        },
        {
            test: /\.js$/,
            include: path.resolve(process.cwd(), './app/pages'),
            use: 'happypack/loader?id=js',
        },  
       ],
    },
    //webpack 不会有大量的 hints 信息，默认为warning
    performance: {
        hints: false,
    },
    plugins: [
       //每次build前，清空public/dist目录
       new CleanWebpackPlugin(['public/dist'],{
        root: path.resolve(process.cwd(), './app/'),
        exclude: [],
        verbose: true,
        dry: false,
       }),
       //提取css的公共部分，有效利用缓存
       new MiniCssExtractPlugin({
        chunkFilename: 'css/[name]_[contenthash:8].bundle.css',
       }),
       //优化并压缩css资源
       new CssMinimizerPlugin(),
       //多线程打包js，加快打包速度
       new happypack({
        ...happypackCommonConfig,
        id: 'js',
        use: [`babel-loader?${JSON.stringify(
            {
                presets: ['@babel/preset-env'],
                plugins: ['@babel/plugin-transform-runtime'],
            }
        )}`],
       }),
       //多线程打包css，加快打包速度
       new happypack({
        ...happypackCommonConfig,
        id: 'css',
        loaders: [
            {
                path:'css-loader',
                options: {
                    importLoaders: 1,
                }
            }
        ]
       }),
       //浏览器在请求资源的时候不发送用户的身份凭证
       new HtmlWebpackInjectAttributesPlugin({
         crossorigin: 'annonymous'
       })
    ],
    optimization: {
        //使用 TerserPlugin 的并发和缓存，提升压缩阶段的性能
        //清除 console.log  
        minimize: true,
        minimizer: [
            new TerserPlugin({
                cache:true,  //启用缓存来加速构建过程
                parallel:true,//利用多核 cpu 的优势来加快压缩速度 
                terserOptions:{
                    compress:{
                        drop_console:true //去掉console.log的内容
                    }
                }
            })
        ]
    },
});

module.exports = webpackConfig;