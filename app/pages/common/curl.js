const md5 = require("md5");
import { ElMessage } from "element-plus";
/**
 * 前端封装 curl 方法
 * @params options 请求参数 
 */
const curl =({
    url,//请求地址
    method='post',//请求方法
    headers={},//请求头
    query={},//url query 
    data={},//post body
    responseType='json',//response data type
    timeout=10000,//超时时间(ms)
    errorMessage='网络异常'
})=>{
    //接口签名处理
    const signKey='dahaudiajdailjaisi';
    const st=Date.now();
    // 构造请求参数
    const ajaxStting={
        url,
        method,
        params: query,
        data,
        responseType,
        timeout,
        headers:{
            ...headers,
            s_t:st,
            s_sign: md5(`${signKey}_${st}`)
        },
        errorMessage
    };
    return axios.request(ajaxStting).then((response)=>{
        const resData =response.data||{};
        //后端返回格式
        const {success} =resData;
        //失败
        if(!success){
            const {message,code}=resData;
            if(code===442){
                ElMessage.error('请求参数异常')
            }
            else if(code===445){
                ElMessage.error('请求不合法')
            }
            else if(code===50000)
                {
                ElMessage.error(errorMessage);
            }
            console.error(message);
            return Promise.resolve({success,code,message});
        }
        //成功
        const {data,metadata} =resData;
        return Promise.resolve({success,data,metadata})
    }).catch((error)=>{
        const {message} =error;
        if(message.match(/timeout/)){
            return Promise.resolve({
                message:'Request Timeout',
                code: 504
            })
        }
        return Promise.resolve(error);
    });
}

export default curl;