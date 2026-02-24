// {
//     mode:'dashboard', //模版类型： 不同模版类型对应不一样的页面
//     name:''//名称,
//     desc:'',//描述
//     icon:'',//icon
//     homePage:'',//首页
//     //头部menu
//     menu:[{
//         key:'', //菜单唯一描述
//         name:'',//菜单名称
//         menuType:'',//枚举值，gruop/ module
//         //当menuType===group时，可填
//         subMenu:[{
//             //可递归menuItem
//         },...],
//         //当menuType === module时，可填
//         moduleType:'',    
//         //当menuType === sider 时，可填
//         siderConfig:{
//             menu:[{
//                  //可递归menuItem（除 menuType=side)
//             }]
//         },
//         //当menuType === iframe 时
//         iframeConfig:{
//             path:'',//iframe路径
//         },      
//         //当menuType === custom 时
//         customConfig:{
//             path:'',//路由路径
//         },   
//         //当menuType === schema 时
//         schemaConfig:{
//             api:'', //数据源API (RESTFUL规范)
//             shcema:{
//                 type:'object',
//                 properties:{
//                     key:{
//                         ...schema,//标准schema配置,
//                         type:'',//字段类型
//                         label:''//字段中文名
//                     },
//                     ...
//                 }
//             },
//             tableConfig:{}, //tabel 相关配置
//             searchConfig:{},//search-bar 相关配置
//             components:{},//模块组件
//         },       
//     }, ...]
// }