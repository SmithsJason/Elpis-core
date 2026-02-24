const path=require('path');
const {sep} =path;
/**
 * 
 * @param {object} app Koa实例
 * 
 * 配置区 本地/测试/生产 通过env环境读取不同文件配置 env.config
 * 通过env.config('local') 覆盖default.config 加载到 app.config中
 * 
 * 目录下对应的config配置
 * 默认配置 config/default.config.js
 * 本地配置 config/local.config.js
 * 测试配置 config/beta.config.js
 * 生产配置 config/production.config.js
 * 
 */
module.exports=(app)=>{
    //找到config目录
    const configPath=path.resolve(app.baseDir,`.${sep}config`)
    //获取default.config
    let defaultConfig={}
    try {
        defaultConfig=require(path.resolve(configPath,`.${sep}config.default.js`))
    } catch (error) {
        console.log('[exception] there is no default.config file')
    }
    //获取env.config
    let envConfig={}
    try{
        if(app.env.isLocal()){ //本地环境
            envConfig=require(path.resolve(configPath,`.${sep}config.local.js`))
        }
        else if(app.env.isBeta()){//测试环境
            envConfig=require(path.resolve(configPath,`.${sep}config.beta.js`))
        }
        else if(app.env.isProduction()){//生产环境
            envConfig=require(path.resolve(configPath,`.${sep}config.prod.js`))
        }
    }catch(e){
        console.log('[exception] there is no env.config file')
    }
    //覆盖并加载config
    app.config=Object.assign({},defaultConfig,envConfig);
}