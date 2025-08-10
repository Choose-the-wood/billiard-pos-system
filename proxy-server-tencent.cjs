require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const tencentcloud = require('tencentcloud-sdk-nodejs');

const app = express();
const PORT = 3001;

// CORS配置
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 腾讯云ASR客户端初始化
const AsrClient = tencentcloud.asr.v20190614.Client;
const clientConfig = {
    credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: "ap-beijing",
    profile: {
        httpProfile: {
            endpoint: "asr.tencentcloudapi.com",
        },
    },
};

const client = new AsrClient(clientConfig);

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        provider: 'tencent-cloud'
    });
});

// 通义千问API代理 - 使用正确的API密钥格式
app.post('/api/qwen', async (req, res) => {
    try {
        const apiKey = process.env.VITE_QWEN_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: '通义千问API密钥未配置',
                details: 'VITE_QWEN_API_KEY环境变量未设置'
            });
        }

        console.log('🔑 使用API密钥:', apiKey.substring(0, 10) + '...');
        console.log('🔑 API密钥长度:', apiKey.length);

        console.log('🤖 调用通义千问API');
        console.log('📊 请求参数:', {
            model: req.body.model,
            messages: req.body.input?.messages?.length || 0,
            temperature: req.body.parameters?.temperature
        });

        // 使用正确的API密钥格式 - 直接作为Authorization header
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            req.body,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-DashScope-SSE': 'disable'
                },
                timeout: 30000
            }
        );

        console.log('📥 通义千问API响应状态:', response.status);
        console.log('📥 通义千问API响应数据:', response.data);

        res.json(response.data);
    } catch (error) {
        console.error('❌ 通义千问API调用失败:', error.response?.data || error.message);
        console.error('❌ 完整错误信息:', error.response || error);

        if (error.response?.status === 401) {
            res.status(401).json({
                error: 'API密钥认证失败',
                details: '请确认API密钥是否正确，或者尝试重新生成API密钥',
                code: 'InvalidApiKey',
                suggestion: '1. 检查API密钥是否正确复制 2. 确认账户余额充足 3. 验证API密钥权限'
            });
        } else if (error.response?.status === 400) {
            res.status(400).json({
                error: '请求参数错误',
                details: error.response?.data || error.message,
                code: 'BadRequest'
            });
        } else {
            res.status(500).json({
                error: '通义千问API调用失败',
                details: error.response?.data || error.message,
                code: 'InternalError'
            });
        }
    }
});

// 腾讯云语音识别（一句话识别）
app.post('/api/speech/recognize', async (req, res) => {
    try {
        const { audioData, format, sample_rate } = req.body;

        if (!audioData) {
            return res.status(400).json({
                error: '缺少必要参数',
                details: '需要audioData参数'
            });
        }

        console.log('🎤 使用腾讯云语音识别进行识别');
        console.log('📊 音频格式:', format || 'wav');
        console.log('📊 采样率:', sample_rate || 16000);
        console.log('📊 音频数据大小:', Buffer.from(audioData, 'base64').length, '字节');

        // 格式映射 - 确保使用腾讯云支持的格式
        let voiceFormat = "wav"; // 默认格式
        if (format === 'pcm') {
            voiceFormat = "pcm";
        } else if (format === 'wav') {
            voiceFormat = "wav";
        } else if (format === 'mp3') {
            voiceFormat = "mp3";
        } else if (format === 'm4a' || format === 'mp4') {
            voiceFormat = "m4a";
        } else if (format === 'aac') {
            voiceFormat = "aac";
        } else {
            // 对于webm或其他不支持的格式，默认使用wav
            voiceFormat = "wav";
            console.log(`⚠️ 不支持的格式 ${format}，使用默认格式 wav`);
        }

        console.log(`🔄 格式映射: ${format} -> ${voiceFormat}`);

        // 腾讯云一句话识别参数
        const params = {
            EngSerViceType: "16k_zh", // 16k中文普通话通用
            SourceType: 1, // 语音数据来源，0：语音URL，1：语音数据（post body）
            VoiceFormat: voiceFormat, // 使用映射后的格式
            Data: audioData, // base64编码的音频数据
            DataLen: Buffer.from(audioData, 'base64').length, // 数据长度
            SubServiceType: 2, // 子服务类型，2表示一句话识别
        };

        console.log('📤 发送腾讯云语音识别请求...');
        console.log('🔧 请求参数:', {
            ...params,
            Data: `[Base64音频数据，长度: ${audioData.length}]`
        });

        // 调用腾讯云一句话识别API
        const data = await client.SentenceRecognition(params);

        console.log('📥 腾讯云API响应:', data);

        if (data.Result) {
            console.log('✅ 语音识别成功:', data.Result);
            res.json({
                success: true,
                result: data.Result,
                status: 20000000,
                message: '语音识别成功',
                provider: 'tencent-cloud'
            });
        } else {
            console.log('⚠️ 未获取到识别结果');
            res.json({
                success: false,
                result: '',
                status: 40000000,
                message: '语音识别完成但未识别到语音内容',
                provider: 'tencent-cloud',
                debug: {
                    audioSize: Buffer.from(audioData, 'base64').length,
                    format: format || 'wav',
                    sampleRate: sample_rate || 16000,
                    suggestion: '请尝试：1.说话声音大一些 2.录音时间长一些 3.确保环境安静'
                }
            });
        }

    } catch (error) {
        console.error('❌ 腾讯云语音识别失败:', error);
        res.status(500).json({
            success: false,
            error: '语音识别失败',
            details: error.message,
            provider: 'tencent-cloud'
        });
    }
});

// 腾讯云实时语音识别（WebSocket方式，暂时不实现）
app.post('/api/speech/recognize-realtime', async (req, res) => {
    res.status(501).json({
        error: '实时语音识别暂未实现',
        message: '请使用一句话识别接口 /api/speech/recognize'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 腾讯云代理服务器运行在端口 ${PORT}`);
    console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
    console.log(`🤖 通义千问代理: http://localhost:${PORT}/api/qwen`);
    console.log(`🎤 腾讯云语音识别: http://localhost:${PORT}/api/speech/recognize`);
    console.log('🔧 使用腾讯云语音识别服务');

    // 检查环境变量
    if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
        console.log('⚠️  警告: 腾讯云密钥未配置');
    }
    if (!process.env.VITE_QWEN_API_KEY) {
        console.log('⚠️  警告: 通义千问API密钥未配置');
    }

    console.log('✅ 服务器启动完成');
});