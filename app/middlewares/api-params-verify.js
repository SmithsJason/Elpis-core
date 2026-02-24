const Ajv=require('ajv');
const ajv=new Ajv();
/**
 * api 参数校验
 */
module.exports = (app) => {
    const $schema='http://json-schema.org/draft-07/schema#';
    return async (ctx, next) => {
        // 只对 API请求 做签名校验
        if(ctx.path.indexOf('/api')< 0){
            return await next();
        }
        //获取请求参数
        const { body,query,headers} =ctx.request;
        const { params ,path, method} =ctx;
        app.logger.info(`[${method} ${path}] body: ${JSON.stringify(body)}`);
        app.logger.info(`[${method} ${path}] query: ${JSON.stringify(query)}`);
        app.logger.info(`[${method} ${path}] params: ${JSON.stringify(params)}`);
        app.logger.info(`[${method} ${path}] headers: ${JSON.stringify(headers)}`);
        
        // 路径匹配：router-schema 中的 key 是 'api/project/list'，但 path 是 '/api/project/list'
        const schemaKey = path.startsWith('/') ? path.substring(1) : path;
        const methodKey = method.toLowerCase();
        const schema = app.routerSchema[schemaKey]?.[methodKey];

        if(!schema){
            return await next();
        }
        let valid=true;
        
        //ajv校验器
        let validate;
        let lastValidate; // 保存最后一次的 validate 函数，用于错误信息

        //校验 headers
        if(valid && headers && schema.headers){
            schema.headers.$schema = $schema;
            validate = ajv.compile(schema.headers);
            valid = validate(headers);
        }
        //校验 body
        if(valid && body && schema.body){
            schema.body.$schema = $schema;
            validate = ajv.compile(schema.body);
            valid = validate(body);
        }
        //校验 query
        if(valid && query && schema.query){
            schema.query.$schema = $schema;
            validate = ajv.compile(schema.query);
            valid = validate(query);
        }
        //校验 params
        if(valid && params && schema.params){
            schema.params.$schema = $schema;
            validate = ajv.compile(schema.params);
            valid = validate(params);
        }
        //校验失败
        if(!valid){
            ctx.status=200;
            ctx.body={
                success:false,
                message:`request validate fail: ${ajv.errorsText(lastValidate?.errors || [])}`,
                code:442
            }
            return;
        }
        await next();
    };
};
