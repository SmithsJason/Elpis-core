//引入日志包
const log4js = require('log4js');
/**
 * 日志工具
 * 外部调用 
 * app.logger.info('info')  
 */
module.exports = (app) => {
    let logger;
    if(app.env.isLocal()){
        logger = console;
    }else{
        // 把日志输出并落地到磁盘(日志落盘)
        // 注意：所有 appender 都必须定义在 appenders 下
        log4js.configure({
            appenders: {
                console: { type: 'console' },
                // 日志文件切分
                dateFile: {
                    type: 'dateFile',
                    filename: './logs/application.log',
                    pattern: 'yyyy-MM-dd',
                    daysToKeep: 30,
                },
            },
            categories: {
                default: { appenders: ['console', 'dateFile'], level: 'trace' },
            },
        });
        logger = log4js.getLogger();
    }
    return logger;
}