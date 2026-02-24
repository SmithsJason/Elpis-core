const glob=require('glob');
const path=require('path');
const {sep} =path;
/**
 * service loadeer
 * @param {object} app Koa实例
 * 
 * 加载所有service，可通过‘app.service.${目录}.${文件}' 访问
 *
    eg:
    app/service
      |
      | --custom-service
            |
            | -- custom-service.js
    =>app.service.customService.customService
 */

module.exports=(app)=>{
    // 读取 app/controller/**/**.js 下的所有文件
    const servicePath=path.resolve(app.businessPath,`.${sep}service`)
    const fileList=glob.sync(path.resolve(servicePath,`.${sep}**${sep}**.js`))

    //遍历所有文件目录，把内容加载到 app.service下
    const service={};
    fileList.forEach(file => {
        //提取文件名称
        let name=path.resolve(file);
        //截取路径 app/service/custom-module/custom-service.js => custom-module/custom-service.js
        name=name.substring(name.lastIndexOf(`service${sep}`)+`service${sep}`.length,name.lastIndexOf('.'))
        //把‘-’统一改成驼峰式，custom-module/custom-service.js =>customModule/customService.js
        name=name.replace(/[_-][a-z]/ig,(s)=> s.substring(1).toUpperCase())
        //挂在service到内存app对象中  
        let temService=service;
        const names=name.split(sep)
        for(let i=0,len=names.length;i<len;i++){
            if(i==len-1)
                {
                    //文件
                    const ServiceModule=require(path.resolve(file))(app);
                    temService[names[i]]=new ServiceModule();
            }
            else{
                //文件夹
                if(!temService[names[i]]){
                    temService[names[i]]={};
                }
                temService=temService[names[i]];
            }
        } 
    });
    app.service=service
}