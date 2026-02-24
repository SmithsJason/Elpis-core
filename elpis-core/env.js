module.exports = (app) => {
    return {
        //判断是否为本地环境
        isLocal() {
            return process.env._ENV === 'local';
        },
        //判断是否为测试环境
        isBeta(){
            return process.env._ENV === 'beta';
        },
        //判断是否为生产环境
        isProduction(){
            return process.env._ENV === 'production';
        },
        //获取环境变量
        getEnv(){
            return process.env._ENV || 'local';
        }
    }
}