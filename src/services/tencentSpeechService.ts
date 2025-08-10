/**
 * 腾讯云语音识别服务
 * 提供实时语音识别和音频文件识别功能
 */

export interface RecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface SpeechEventListeners {
  onResult?: (result: RecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class TencentSpeechService {
  private static instance: TencentSpeechService | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  private eventListeners: SpeechEventListeners | null = null;

  // 腾讯云配置
  private config = {
    region: "ap-beijing",
    format: "wav",
    sampleRate: 16000,
    enablePunctuationPrediction: true,
    enableInverseTextNormalization: true,
    enableVoiceDetection: true,
  };

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TencentSpeechService {
    if (!TencentSpeechService.instance) {
      TencentSpeechService.instance = new TencentSpeechService();
    }
    return TencentSpeechService.instance;
  }

  /**
   * 设置事件监听器
   */
  setEventListeners(listeners: SpeechEventListeners): void {
    this.eventListeners = listeners;
  }

  /**
   * 检查浏览器是否支持语音识别
   */
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined"
    );
  }

  /**
   * 获取支持的音频格式（优先腾讯云支持的格式）
   */
  private getSupportedMimeType(): string {
    // 优先使用腾讯云直接支持的格式
    const types = [
      "audio/wav", // 腾讯云支持
      "audio/mp4", // 腾讯云支持（m4a）
      "audio/webm;codecs=opus", // 需要转换
      "audio/webm", // 需要转换
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`🎵 选择音频格式: ${type}`);
        return type;
      }
    }

    return "audio/wav"; // 默认格式
  }

  /**
   * 开始语音识别
   */
  async startRecognition(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("当前浏览器不支持语音识别功能");
    }

    if (this.isRecording) {
      throw new Error("语音识别已在进行中");
    }

    try {
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 创建MediaRecorder，优先使用WAV格式
      let mimeType = "audio/wav";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = this.getSupportedMimeType();
      }

      console.log("🎤 使用音频格式:", mimeType);

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000, // 设置音频比特率
      });

      // 设置录音事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudioBlob();
        this.cleanup();
      };

      this.mediaRecorder.onerror = (event) => {
        this.eventListeners?.onError?.("录音过程中发生错误");
        this.cleanup();
      };

      // 开始录音
      this.audioChunks = [];
      this.mediaRecorder.start(1000); // 每秒收集一次数据
      this.isRecording = true;

      this.eventListeners?.onStart?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "启动语音识别失败";
      this.eventListeners?.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * 停止语音识别
   */
  stopRecognition(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.isRecording = false;
    this.eventListeners?.onEnd?.();
  }

  /**
   * 识别音频文件
   */
  async recognizeAudioFile(file: File): Promise<void> {
    try {
      this.eventListeners?.onStart?.();

      // 将文件转换为Base64
      const base64Audio = await this.convertBlobToBase64(file);

      // 调用腾讯云语音识别API
      await this.callTencentSpeechAPI(base64Audio, file.type);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "音频文件识别失败";
      this.eventListeners?.onError?.(errorMessage);
    } finally {
      this.eventListeners?.onEnd?.();
    }
  }

  /**
   * 处理录音数据
   */
  private processAudioBlob(): void {
    if (this.audioChunks.length === 0) {
      return;
    }

    try {
      // 合并音频数据
      const audioBlob = new Blob(this.audioChunks, {
        type: this.getSupportedMimeType(),
      });

      console.log("🎵 处理音频Blob:", {
        size: audioBlob.size,
        type: audioBlob.type,
      });

      // 检查音频数据大小
      if (audioBlob.size < 1000) {
        console.warn("⚠️ 警告：音频数据可能太短，大小:", audioBlob.size);
      }

      // 调用腾讯云语音识别API
      this.callTencentSpeechAPIFromBlob(audioBlob);
    } catch (error) {
      this.eventListeners?.onError?.("处理音频数据失败");
    }
  }

  /**
   * 从Blob调用腾讯云语音识别API
   */
  private async callTencentSpeechAPIFromBlob(audioBlob: Blob): Promise<void> {
    try {
      let processedBlob = audioBlob;

      // 如果是WebM格式，转换为WAV
      if (audioBlob.type.includes("webm")) {
        console.log("🔄 检测到WebM格式，开始转换为WAV...");
        try {
          processedBlob = await this.convertWebMToWAV(audioBlob);
          console.log("✅ WebM转WAV成功，新格式:", processedBlob.type);
        } catch (conversionError) {
          console.warn("⚠️ WebM转WAV失败，使用原始格式:", conversionError);
          // 转换失败时仍然尝试使用原始格式
          processedBlob = audioBlob;
        }
      }

      const base64Audio = await this.convertBlobToBase64(processedBlob);
      console.log("📊 Base64音频数据长度:", base64Audio.length);

      await this.callTencentSpeechAPI(base64Audio, processedBlob.type);
    } catch (error) {
      console.error("❌ 从Blob调用腾讯云语音识别API失败:", error);
      this.eventListeners?.onError?.(
        `语音识别失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 将WebM音频转换为WAV格式
   */
  private async convertWebMToWAV(webmBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const fileReader = new FileReader();

        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // 转换为WAV格式
            const wavBlob = this.audioBufferToWAV(audioBuffer);
            resolve(wavBlob);
          } catch (error) {
            console.error("音频解码失败:", error);
            reject(error);
          }
        };

        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(webmBlob);
      } catch (error) {
        console.error("音频转换失败:", error);
        reject(error);
      }
    });
  }

  /**
   * 将AudioBuffer转换为WAV格式的Blob
   */
  private audioBufferToWAV(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = 1; // 单声道
    const sampleRate = this.config.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const length = audioBuffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF标识符
    writeString(0, "RIFF");
    // 文件长度
    view.setUint32(4, 36 + length * 2, true);
    // WAVE标识符
    writeString(8, "WAVE");
    // fmt子块
    writeString(12, "fmt ");
    // fmt子块长度
    view.setUint32(16, 16, true);
    // 音频格式
    view.setUint16(20, format, true);
    // 声道数
    view.setUint16(22, numberOfChannels, true);
    // 采样率
    view.setUint32(24, sampleRate, true);
    // 字节率
    view.setUint32(28, (sampleRate * numberOfChannels * bitDepth) / 8, true);
    // 块对齐
    view.setUint16(32, (numberOfChannels * bitDepth) / 8, true);
    // 位深度
    view.setUint16(34, bitDepth, true);
    // data子块
    writeString(36, "data");
    // data子块长度
    view.setUint32(40, length * 2, true);

    // 写入音频数据
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  /**
   * 调用腾讯云语音识别API
   */
  private async callTencentSpeechAPI(
    base64Audio: string,
    audioType: string
  ): Promise<void> {
    try {
      // 腾讯云支持的格式映射
      let format = "wav"; // 默认格式
      let needsConversion = false;

      if (audioType.includes("webm")) {
        // WebM格式需要转换为WAV
        format = "wav";
        needsConversion = true;
        console.log("🔄 检测到WebM格式，需要转换为WAV");
      } else if (audioType.includes("mp4") || audioType.includes("m4a")) {
        format = "m4a";
      } else if (audioType.includes("mp3")) {
        format = "mp3";
      } else if (audioType.includes("wav")) {
        format = "wav";
      } else if (audioType.includes("pcm")) {
        format = "pcm";
      }

      console.log(`🔄 音频格式处理: ${audioType} -> ${format}`);

      // 准备请求数据
      const requestData = {
        audioData: base64Audio,
        format: format,
        sample_rate: this.config.sampleRate,
      };

      console.log("📤 发送腾讯云语音识别请求:", {
        ...requestData,
        audioData: `[Base64音频数据，长度: ${base64Audio.length}]`,
      });

      // 通过代理服务器调用腾讯云语音识别API
      const response = await fetch(
        "http://localhost:3001/api/speech/recognize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `腾讯云API调用失败: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("📥 腾讯云语音识别API响应:", result);

      if (result.success && result.result) {
        // 识别成功
        const recognitionResult: RecognitionResult = {
          text: result.result,
          confidence: 0.9, // 腾讯云默认置信度
          isFinal: true,
          timestamp: Date.now(),
        };

        console.log("✅ 语音识别成功:", recognitionResult);
        this.eventListeners?.onResult?.(recognitionResult);
      } else {
        // 如果识别结果为空，可能是音频质量问题
        if (!result.result || result.result.trim() === "") {
          console.warn("⚠️ 语音识别结果为空，可能原因：");
          console.warn("   1. 音频中没有清晰的语音内容");
          console.warn("   2. 音频质量不佳或噪音过大");
          console.warn("   3. 音频时长过短");
          this.eventListeners?.onError?.(
            "未识别到语音内容，请确保说话清晰并重试"
          );
        } else {
          throw new Error(result.message || result.error || "语音识别失败");
        }
      }
    } catch (error) {
      console.error("❌ 腾讯云语音识别API调用失败:", error);
      this.eventListeners?.onError?.(
        `语音识别失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 将Blob转换为Base64
   */
  private async convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:audio/xxx;base64,前缀
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * 获取当前录音状态
   */
  getRecordingState(): boolean {
    return this.isRecording;
  }

  /**
   * 获取配置信息
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export default TencentSpeechService;
