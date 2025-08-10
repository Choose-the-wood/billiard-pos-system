import axios from 'axios';

async function testTencentSpeechRecognition() {
    try {
        console.log('🚀 开始测试腾讯云语音识别API...');

        // 创建一个简单的测试音频数据（WAV格式的静音）
        const sampleRate = 16000;
        const duration = 2; // 2秒
        const samples = sampleRate * duration;

        // 创建WAV文件头
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + samples * 2, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(1, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(sampleRate * 2, 28);
        wavHeader.writeUInt16LE(2, 32);
        wavHeader.writeUInt16LE(16, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(samples * 2, 40);

        // 创建音频数据（简单的正弦波）
        const audioData = Buffer.alloc(samples * 2);
        for (let i = 0; i < samples; i++) {
            const value = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 1000; // 440Hz正弦波
            audioData.writeInt16LE(value, i * 2);
        }

        // 合并WAV头和音频数据
        const wavBuffer = Buffer.concat([wavHeader, audioData]);
        const base64Audio = wavBuffer.toString('base64');

        console.log('📊 测试音频数据大小:', wavBuffer.length, '字节');
        console.log('📊 Base64长度:', base64Audio.length);

        const requestData = {
            audioData: base64Audio,
            format: "wav",
            sample_rate: 16000
        };

        console.log('📤 发送请求到腾讯云语音识别API...');

        const response = await axios.post('http://localhost:3001/api/speech/recognize', requestData, {
            timeout: 30000
        });

        console.log('📥 API响应:', response.data);

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

testTencentSpeechRecognition();