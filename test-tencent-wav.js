import axios from 'axios';

async function testTencentWavRecognition() {
    try {
        console.log('🚀 开始测试腾讯云WAV语音识别...');

        // 创建标准的WAV格式音频数据
        const sampleRate = 16000;
        const duration = 3; // 3秒
        const samples = sampleRate * duration;

        // 创建标准WAV文件头（44字节）
        const wavHeader = Buffer.alloc(44);

        // RIFF头
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + samples * 2, 4); // 文件大小-8
        wavHeader.write('WAVE', 8);

        // fmt块
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);        // fmt块大小
        wavHeader.writeUInt16LE(1, 20);         // 音频格式(PCM)
        wavHeader.writeUInt16LE(1, 22);         // 声道数
        wavHeader.writeUInt32LE(sampleRate, 24); // 采样率
        wavHeader.writeUInt32LE(sampleRate * 2, 28); // 字节率
        wavHeader.writeUInt16LE(2, 32);         // 块对齐
        wavHeader.writeUInt16LE(16, 34);        // 位深度

        // data块
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(samples * 2, 40); // 数据大小

        // 创建音频数据（混合频率的正弦波，更像语音）
        const audioData = Buffer.alloc(samples * 2);
        for (let i = 0; i < samples; i++) {
            // 混合多个频率，模拟语音特征
            const t = i / sampleRate;
            const value = (
                Math.sin(2 * Math.PI * 200 * t) * 0.3 +  // 基频
                Math.sin(2 * Math.PI * 400 * t) * 0.2 +  // 第一泛音
                Math.sin(2 * Math.PI * 600 * t) * 0.1 +  // 第二泛音
                (Math.random() - 0.5) * 0.1              // 添加少量噪音
            ) * 8000; // 放大到合适的音量

            audioData.writeInt16LE(Math.round(value), i * 2);
        }

        // 合并WAV头和音频数据
        const wavBuffer = Buffer.concat([wavHeader, audioData]);
        const base64Audio = wavBuffer.toString('base64');

        console.log('📊 WAV音频数据信息:');
        console.log('  - 总大小:', wavBuffer.length, '字节');
        console.log('  - 采样率:', sampleRate, 'Hz');
        console.log('  - 时长:', duration, '秒');
        console.log('  - 声道数: 1 (单声道)');
        console.log('  - 位深度: 16位');
        console.log('  - Base64长度:', base64Audio.length);

        const requestData = {
            audioData: base64Audio,
            format: "wav",
            sample_rate: sampleRate
        };

        console.log('📤 发送请求到腾讯云语音识别API...');

        const response = await axios.post('http://localhost:3001/api/speech/recognize', requestData, {
            timeout: 30000
        });

        console.log('📥 API响应:', response.data);

        if (response.data.success) {
            console.log('✅ 测试成功！');
        } else {
            console.log('⚠️ 识别结果为空，这是正常的，因为发送的是测试音频而非真实语音');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

testTencentWavRecognition();