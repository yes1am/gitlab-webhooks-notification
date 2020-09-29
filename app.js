const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { sendMessage } = require('./webhooks.config');

app.use(bodyParser.json())

const SKIP_SEND_MESSAGE = 'SKIP SEND MESSAGE'

const MERGE_REQUEST = 'merge request hook';
const PIPELINE = 'pipeline hook';

const handleMergeRequest = async (body = {}, query = {}) => {
  const { user = {}, project = {}, object_attributes: attributes = {} } = body;
  // 用户名
  const { name: userName } = user;
  // 项目名和项目地址
  const { name: projectName, web_url: projectUrl } = project;
  const { source_branch: sourceBranch, target_branch: targetBranch, url, state } = attributes;
  return `Merge request:\n\n${userName}: [${sourceBranch}] => [${targetBranch}] \n状态: ${state}\nLink: ${url}`;
}

const handlePipeline = async (body, query = {}) => {
  const { ref = '' } = query;
  let refsArr = ref.split(',').filter(Boolean);
  refsArr = [...new Set(refsArr.concat(['master']))];  // 默认 master 会发送通知消息
  const { user = {}, project = {}, object_attributes: attributes = {}, commit = {} } = body;
  // 用户名
  const { status, ref: sourceBranch } = attributes;
  const { url, author = {} } = commit;
  const { name: userName } = author

  if(status === 'pending') {
    return SKIP_SEND_MESSAGE;
  }

  if(refsArr.includes(sourceBranch)) {
    return `Pipeline:\n\n${userName}: Status ${status} \nLink: ${url}`;
  } else {
    return SKIP_SEND_MESSAGE;
  }
}


app.post('/', async function (req, res) {
  const { headers, body, query } = req;
  const { token } = query;
  if(!token) {
    res.status(403).send('token is required');
    return;
  }

  // eventType: 'Push Hook'
  let { 'x-gitlab-event': eventType } = headers;
  eventType = eventType.toLowerCase();

  try {
    let message = ''
    if(eventType === MERGE_REQUEST) {
      message = await handleMergeRequest(body);
    } else if(eventType === PIPELINE) {
      message = await handlePipeline(body, query);
    }
    if(message !== SKIP_SEND_MESSAGE) {
      await sendMessage(message, token)
    }
  } catch (e) {
    console.log('发生错误', e);
  }
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});