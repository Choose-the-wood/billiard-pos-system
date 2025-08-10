#!/usr/bin/env node

const https = require('https');

// 从环境变量读取配置
require('dotenv').config();

const config = {
  accessKeyId: process.env.VITE_ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.VITE_ALI_ACCESS_KEY_SECRET,
  appKey: process.env.VITE_ALI_SPEECH_APP_KEY
};

console.log('🔍 阿里云语音服务测试工具');
console.log('================================');

// 检查配置
console.log('📋 配置检查:');
console.log(`AccessKeyId: ${config.accessKeyId ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`AccessKeySecret: ${config.accessKeySecret ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`AppKey: ${config.appKey ? '✅ 已配置' : '❌ 未配置'}`);
console.log('');

if (!config.accessKeyId || !config.accessKeySecret || !config.appKey) {
  console.log('❌ 配置不完整，请检查.env文件');
  process.exit(1);
}

// 测试代理服务器
console.log('🌐 测试代理服务器...');

const testProxyServer = () => {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      // 尝试HTTP
      const http = require('http');
      const httpReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/health',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      });

      httpReq.on('error', reject);
      httpReq.end();
    });

    req.end();
  });
};

// 测试Token获取
const testTokenAPI = () => {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/speech/token',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// 执行测试
async function runTests() {
  try {
    // 测试代理服务器健康状态
    console.log('正在检查代理服务器状态...');
    const healthResult = await testProxyServer();
    console.log('✅ 代理服务器运行正常');
    console.log(`   端口: ${healthResult.port}`);
    console.log(`   SDK状态: ${healthResult.sdk['pop-core']}`);
    console.log('');

    // 测试Token获取
    console.log('正在测试Token获取...');
    const tokenResult = await testTokenAPI();
    
    if (tokenResult.error) {
      console.log('❌ Token获取失败');
      console.log(`   错误码: ${tokenResult.code}`);
      console.log(`   错误信息: ${tokenResult.message}`);
      console.log('');
      
      if (tokenResult.code === 40020503) {
        console.log('🔧 解决方案:');
        console.log('1. 请访问 https://nls.console.aliyun.com/ 开通智能语音交互服务');
        console.log('2. 创建语音识别项目并获取新的AppKey');
        console.log('3. 确保API密钥具有AliyunNlsFullAccess权限');
        console.log('');
        console.log('📖 详细指南请查看: 阿里云语音服务开通指南.md');
      }
    } else if (tokenResult.token) {
      console.log('✅ Token获取成功');
      console.log(`   Token: ${tokenResult.token.substring(0, 20)}...`);
      console.log(`   过期时间: ${new Date(tokenResult.expireTime * 1000).toLocaleString()}`);
      console.log('');
      console.log('🎉 阿里云语音服务配置正确，可以正常使用！');
    }

  } catch (error) {
    console.log('❌ 测试过程中出现错误:');
    console.log(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 解决方案:');
      console.log('代理服务器未运行，请执行以下命令启动:');
      console.log('node proxy-server.cjs');
    }
  }
}

runTests();