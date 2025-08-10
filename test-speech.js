import axios from 'axios';

async function testSpeechRecognition() {
    try {
        console.log('开始测试语音识别API...');

        // 创建一个简单的测试音频数据（PCM格式的静音）
        const sampleRate = 16000;
        const duration = 2; // 2秒
        const samples = sampleRate * duration;
        const audioBuffer = Buffer.alloc(samples * 2); // 16位PCM

        // 填充一些简单的音频数据（不是完全静音）
        for (let i = 0; i < samples; i++) {
            const value = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 1000; // 440Hz正弦波
            audioBuffer.writeInt16LE(value, i * 2);
        }

        const base64Audio = audioBuffer.toString('base64');

        console.log('测试音频数据大小:', audioBuffer.length, '字节');
        console.log('Base64长度:', base64Audio.length);

        // 首先获取真实的token
        console.log('获取访问token...');
        const tokenResponse = await axios.get('http://localhost:3001/api/speech/token');
        console.log('Token响应:', tokenResponse.data);

        const requestData = {
            appkey: "5Ki1WN0tOMXlGmvL",
            format: "pcm",
            sample_rate: 16000,
            audioData: base64Audio,
            token: tokenResponse.data.token
        };

        console.log('发送请求到语音识别API...');

        const response = await axios.post('http://localhost:3001/api/speech/recognize', requestData, {
            timeout: 30000
        });

        console.log('API响应:', response.data);

    } catch (error) {
        console.error('测试失败:', error.response?.data || error.message);
    }
}

testSpeechRecognition();