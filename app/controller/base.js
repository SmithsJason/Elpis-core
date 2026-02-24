module.exports = (app) =>  class BaseController {
        /**
         * controller 基类
         * 统一收拢controller的公共方法
         */
        constructor() {
            this.app = app;
            this.config = app.config;
        }
        /**
         *API 处理成功时统一返回结构
         * @param {object} ctx 上下文
         * @param {object} data 数据
         * @param {object} metadata 附加数据
         */
        success(ctx, data={}, metadata={}) {
            ctx.status = 200;
            ctx.body = {
                success: true,
                data: data,
                metadata: metadata,
            };
        }
        /**
         * API 处理失败时统一返回结构
         * @param {object} ctx 上下文
         * @param {string} message 错误信息
         * @param {number} code 错误码
         */
        fail(ctx, message, code) {
            ctx.body = {
                success: false,
                message: message,
                code: code,
            };
        }
    }