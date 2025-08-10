require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Core = require('@alicloud/pop-core');
const { SpeechRecognition } = require('alibabacloud-nls');

const app = express();
const PORT = 3001;

// CORS配置
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 通义千问API代理
app.post('/api/qwen', async (req, res) => {
    try {
        const apiKey = process.env.DASHSCOPE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: '通义千问API密钥未配置',
                details: 'DASHSCOPE_API_KEY环境变量未设置'
            });
        }

        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            req.body,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('通义千问API调用失败:', error.response?.data || error.message);
        res.status(500).json({
            error: '通义千问API调用失败',
            details: error.response?.data || error.message
        });
    }
});

// 阿里云语音识别Token获取（使用SDK，带备用模拟Token）
app.get('/api/speech/token', async (req, res) => {
    try {
        const accessKeyId = process.env.VITE_ALI_ACCESS_KEY_ID;
        const accessKeySecret = process.env.VITE_ALI_ACCESS_KEY_SECRET;

        if (!accessKeyId || !accessKeySecret) {
            return res.status(500).json({
                error: '阿里云访问密钥未配置',
                details: 'VITE_ALI_ACCESS_KEY_ID或VITE_ALI_ACCESS_KEY_SECRET环境变量未设置'
            });
        }

        console.log('使用阿里云官方Node.js SDK获取Token');

        try {
            const client = new Core({
                accessKeyId: accessKeyId,
                accessKeySecret: accessKeySecret,
                endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
                apiVersion: '2019-02-28',
                timeout: 5000 // 设置5秒超时
            });

            const params = {};
            const requestOption = {
                method: 'POST',
                formatParams: false,
            };

            const result = await client.request('CreateToken', params, requestOption);

            if (result && result.Token && result.Token.Id) {
                console.log('Token获取成功:', result.Token.Id);
                res.json({
                    token: result.Token.Id,
                    expireTime: result.Token.ExpireTime
                });
                return;
            } else {
                console.error('Token获取失败，响应格式异常:', result);
                throw new Error('响应格式异常');
            }
        } catch (apiError) {
            console.error('阿里云API调用失败，使用模拟Token:', apiError.message);
            // 使用模拟Token
            const mockToken = `mock-token-${Date.now()}`;
            console.log('使用模拟Token:', mockToken);
            res.json({
                token: mockToken,
                expireTime: Date.now() + 3600000, // 1小时后过期
                isMock: true
            });
        }
    } catch (error) {
        console.error('Token获取失败:', error);
        // 即使出错也返回模拟Token，确保前端可以继续测试
        const mockToken = `emergency-mock-token-${Date.now()}`;
        console.log('使用紧急模拟Token:', mockToken);
        res.json({
            token: mockToken,
            expireTime: Date.now() + 3600000, // 1小时后过期
            isMock: true,
            error: error.message
        });
    }
});

// 阿里云语音识别（根据官方文档重新实现）
app.post('/api/speech/recognize', async (req, res) => {
    try {
        const { audioData, token, appkey, format, sample_rate } = req.body;

        if (!audioData || !token || !appkey) {
            return res.status(400).json({
                error: '缺少必要参数',
                details: '需要audioData、token和appkey参数'
            });
        }

        console.log('使用阿里云语音识别SDK进行识别');
        console.log('Token:', token.substring(0, 10) + '...');
        console.log('AppKey:', appkey);
        console.log('Format:', format || 'pcm');
        console.log('Sample Rate:', sample_rate || 16000);

        // 根据官方文档，使用正确的事件处理方式
        try {
            const recognizer = new SpeechRecognition({
                url: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
                appkey: appkey,
                token: token
            });

            let recognitionResult = '';
            let isCompleted = false;
            let hasError = false;
            let errorMessage = '';

            // 设置所有可能的事件监听器进行调试
            recognizer.on('started', (message) => {
                console.log('✓ 识别开始:', message);
            });

            recognizer.on('changed', (message) => {
                console.log('✓ 识别中间结果:', message);
                try {
                    const msgObj = JSON.parse(message);
                    if (msgObj.payload && msgObj.payload.result) {
                        recognitionResult = msgObj.payload.result;
                        console.log('✓ 获取到中间结果:', recognitionResult);
                    }
                } catch (parseError) {
                    console.error('✗ 解析中间结果失败:', parseError);
                }
            });

            recognizer.on('completed', (message) => {
                console.log('✓ 识别完成:', message);
                try {
                    const msgObj = JSON.parse(message);
                    if (msgObj.payload && msgObj.payload.result) {
                        recognitionResult = msgObj.payload.result;
                        console.log('✓ 获取到最终结果:', recognitionResult);
                    }
                } catch (parseError) {
                    console.error('✗ 解析最终结果失败:', parseError);
                }
                isCompleted = true;
            });

            recognizer.on('failed', (message) => {
                console.error('✗ 识别失败:', message);
                try {
                    const msgObj = JSON.parse(message);
                    errorMessage = msgObj.message || msgObj.error_message || '识别失败';
                    console.error('✗ 失败原因:', errorMessage);
                } catch (parseError) {
                    errorMessage = message;
                }
                hasError = true;
                isCompleted = true;
            });

            recognizer.on('closed', () => {
                console.log('✓ 连接已关闭');
                if (!isCompleted) {
                    console.log('⚠ 连接关闭但识别未完成');
                    isCompleted = true;
                }
            });

            // 添加错误事件监听
            recognizer.on('error', (error) => {
                console.error('✗ 连接错误:', error);
                hasError = true;
                errorMessage = error.message || '连接错误';
                isCompleted = true;
            });

            // 添加所有可能的事件监听器进行调试
            recognizer.on('RecognitionStarted', (message) => {
                console.log('✓ RecognitionStarted:', message);
            });

            recognizer.on('RecognitionResultChanged', (message) => {
                console.log('✓ RecognitionResultChanged:', message);
                try {
                    const msgObj = JSON.parse(message);
                    if (msgObj.payload && msgObj.payload.result) {
                        recognitionResult = msgObj.payload.result;
                    }
                } catch (parseError) {
                    console.error('解析结果失败:', parseError);
                }
            });

            recognizer.on('RecognitionCompleted', (message) => {
                console.log('✓ RecognitionCompleted:', message);
                try {
                    const msgObj = JSON.parse(message);
                    if (msgObj.payload && msgObj.payload.result) {
                        recognitionResult = msgObj.payload.result;
                    }
                } catch (parseError) {
                    console.error('解析完成结果失败:', parseError);
                }
                isCompleted = true;
            });

            recognizer.on('TaskFailed', (message) => {
                console.error('✗ TaskFailed:', message);
                hasError = true;
                errorMessage = message;
                isCompleted = true;
            });

            // 开始识别参数（根据官方文档调整）
            const startParams = {
                format: format || 'pcm',
                sample_rate: sample_rate || 16000,
                enable_intermediate_result: true,
                enable_punctuation_prediction: true,
                enable_inverse_text_normalization: true,
                enable_voice_detection: true,
                max_end_silence: 800,
                max_start_silence: 3000
            };

            console.log('开始语音识别，参数:', startParams);

            // 简化的识别流程
            console.log('开始语音识别流程...');

            const audioBuffer = Buffer.from(audioData, 'base64');
            console.log('音频数据大小:', audioBuffer.length, '字节');

            if (audioBuffer.length < 1000) {
                console.warn('⚠ 警告：音频数据可能太短，长度:', audioBuffer.length);
            }

            // 直接使用start方法，不使用回调
            try {
                console.log('调用 recognizer.start...');
                await recognizer.start(startParams);
                console.log('✓ start 调用成功');

                // 一次性发送所有音频数据
                console.log('发送音频数据...');
                recognizer.sendAudio(audioBuffer);
                console.log('✓ 音频数据发送完成');

                // 等待一段时间让音频处理
                console.log('等待音频处理...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 停止识别 - 使用正确的方法名
                console.log('停止识别...');
                recognizer.close();
                console.log('✓ 停止识别调用完成');

                // 等待识别结果
                console.log('等待识别结果...');
                let waitTime = 0;
                const maxWaitTime = 10000; // 10秒超时

                while (!isCompleted && !hasError && waitTime < maxWaitTime) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitTime += 100;

                    if (waitTime % 1000 === 0) {
                        console.log(`等待中... ${waitTime / 1000}s`);
                    }
                }

                console.log('等待结束，状态:', { isCompleted, hasError, recognitionResult });

            } catch (startError) {
                console.error('✗ start 调用失败:', startError);
                throw startError;
            }

            const result = recognitionResult;

            if (result && result.trim()) {
                console.log('✅ 语音识别成功:', result);
                res.json({
                    success: true,
                    result: result,
                    status: 20000000,
                    message: '语音识别成功'
                });
            } else {
                console.log('⚠️ 识别结果为空 - 可能是音频中没有语音内容');
                console.log('这通常发生在以下情况：');
                console.log('1. 音频中只有静音或噪音');
                console.log('2. 音频质量太低');
                console.log('3. 语音内容太短');
                console.log('4. 音频格式转换有问题');

                res.json({
                    success: false,
                    result: '',
                    status: 40000000,
                    message: '语音识别完成但未识别到语音内容，请确保录音时有清晰的语音',
                    debug: {
                        audioSize: Buffer.from(audioData, 'base64').length,
                        format: format || 'pcm',
                        sampleRate: sample_rate || 16000,
                        tokenLength: token.length,
                        appkey: appkey,
                        suggestion: '请尝试：1.说话声音大一些 2.录音时间长一些 3.确保环境安静'
                    }
                });
            }

        } catch (sdkError) {
            console.error('阿里云SDK调用失败:', sdkError);
            res.status(500).json({
                success: false,
                error: '语音识别失败',
                details: sdkError.message
            });
        }

    } catch (error) {
        console.error('语音识别失败:', error);
        res.status(500).json({
            success: false,
            error: '语音识别失败',
            details: error.message
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`代理服务器运行在端口 ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`通义千问代理: http://localhost:${PORT}/api/qwen`);
    console.log(`阿里云语音识别代理: http://localhost:${PORT}/api/speech/recognize`);
    console.log(`阿里云Token获取代理: http://localhost:${PORT}/api/speech/token`);
    console.log('使用阿里云官方Node.js SDK获取Token');

    if (!process.env.DASHSCOPE_API_KEY) {
        console.log('⚠️  警告: 通义千问API密钥未配置');
    }
});