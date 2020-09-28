<p align="center">
  <img src="https://raw.githubusercontent.com/yes1am/PicBed/master/img/gitlab.png" />
</p>

# Gitlab Webhooks 提醒服务

## 使用

1. npm install && npm install pm2 -g
2. 在根目录新建 `webhooks.config.js`，配置发送消息的代码，示例:

```js
const rp = require('request-promise');
const sendMessage = async (content, token) => {
  // token 和项目有关，即不同的项目应该使用不同的 token 来接受消息
  return rp({
    method: 'POST',
    uri: `xxxxxx${token}`,  // 接受消息提醒的机器人地址，如企业微信机器人地址
    body: {
      tag: "text",
      text: {
        content,
      }
    },
    headers: {
      'Content-Type': 'application/json'
    },
    json: true
  })
}

module.exports = {
  sendMessage
}
```
3. pm2 app.js

4. 配置 Gitlab Webhooks
   1. 进入 Gitlab 项目首页，点击左侧 `Setting` 菜单, 选择 `Integrations`. (确保你拥有项目的权限，才能找到 `Setting` => `Integrations` )
   2. 配置 url: http://your.site?token=xxxx (不同的项目应该有不同的 token, 因为目前没有在消息提醒里展示项目信息)
   3. 勾选 Trigger: `Merge request events`，`Pipeline events`
   4. 点击 `Add Webhook`
5. 配置完毕，当 Git 仓库发生 `Merge request events` 或 `Pipeline events` 时，即可收到消息。
