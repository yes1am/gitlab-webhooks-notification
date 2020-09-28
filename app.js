const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { sendMessage } = require('./webhooks.config');

app.use(bodyParser.json())

const MERGE_REQUEST = 'merge request hook';
const PIPELINE = 'pipeline hook';

const handleMergeRequest = async (body = {}) => {
  const { user = {}, project = {}, object_attributes: attributes = {} } = body;
  // 用户名
  const { name: userName } = user;
  // 项目名和项目地址
  const { name: projectName, web_url: projectUrl } = project;
  const { source_branch: sourceBranch, target_branch: targetBranch, url, state } = attributes;
  return `Merge request:\n\n${userName}: [${sourceBranch}] => [${targetBranch}] \n状态: ${state}\nLink: ${url}`;
}

const handlePipeline = async (body) => {
  const { user = {}, project = {}, object_attributes: attributes = {}, commit = {} } = body;
  // 用户名
  const { status } = attributes;
  const { url, author = {} } = commit;
  const { name: userName } = author

  return `Pipeline:\n\n${userName}: Status ${status} \nLink: ${url}`;
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
      message = await handlePipeline(body);
    }
    await sendMessage(message, token)
  } catch (e) {
    console.log('发生错误', e);
  }
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});