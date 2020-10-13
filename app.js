const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { sendMessage } = require('./webhooks.config');

app.use(bodyParser.json())

const SKIP_SEND_MESSAGE = 'SKIP SEND MESSAGE'

const MERGE_REQUEST = 'merge request hook';
const PIPELINE = 'pipeline hook';
const JOB = 'job hook';

const handleMergeRequest = async (body = {}, query = {}) => {
  const { user = {}, project = {}, object_attributes: attributes = {} } = body;
  // 用户名
  const { name: userName } = user;
  // 项目名和项目地址
  const { name: projectName, web_url: projectUrl } = project;
  const { source_branch: sourceBranch, target_branch: targetBranch, url, state } = attributes;
  return `Merge request: \n作者: ${userName} \nMR 分支: [${sourceBranch}] => [${targetBranch}] \n状态: ${state} \n链接: ${url}`;
}

const handlePipeline = async (body, query = {}) => {
  const { ref = '' } = query;
  let refsArr = ref.split(',').filter(Boolean);
  refsArr = [...new Set(refsArr.concat(['master']))];  // 默认 master 会发送通知消息
  const { user = {}, project = {}, object_attributes: attributes = {}, commit = {} } = body;
  // 用户名
  const { status, ref: sourceBranch } = attributes;
  console.log('====pipeline====');
  console.log(body);
  const { url, author = {} } = commit;
  const { name: userName } = author

  // 不发送 pending 状态
  if(['pending'].includes(status)) {
    return SKIP_SEND_MESSAGE;
  }

  if(refsArr.includes(sourceBranch)) {
    return `Pipeline: \n作者: ${userName} \n状态: ${status} \n链接: ${url}`;
  } else {
    return SKIP_SEND_MESSAGE;
  }
}

const handleJob = async (body) => {
  const { build_stage: stage, build_status: status, commit = {} } = body;
  const { author_name: userName, message } = commit
  console.log('====job====');
  console.log(body);

  // 不发送 pending，created, running 状态
  if(['pending', 'created', 'running'].includes(status)) {
    return SKIP_SEND_MESSAGE;
  }
  // publish 和 deploy 会发送消息
  if(['publish', 'deploy'].includes(stage)) {
    if(stage === 'publish') {
      // publish 时带上 commit message 信息作为版本
      return `Job: \n作者: ${userName} \nStage: ${stage} \n版本: ${message} \n状态: ${status}`;
    }
    return `Job: \n作者: ${userName} \nStage: ${stage} \n状态: ${status}`;
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
    } else if(eventType === JOB) {
      message = await handleJob(body, query);
    }
    if(message && message !== SKIP_SEND_MESSAGE) {
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