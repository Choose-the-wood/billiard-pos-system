import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Mic, MicOff, Upload, Volume2 } from 'lucide-react';
import { useBilliardStore } from '../store';
import { TencentSpeechService, RecognitionResult } from '../services/tencentSpeechService';
import QwenServiceSimple from '../services/qwenServiceSimple';

interface VoiceRecognitionProps {
  onResult?: (result: string) => void;
}

export const VoiceRecognition: React.FC<VoiceRecognitionProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const speechService = useRef<TencentSpeechService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    tables,
    openTable,
    closeTable,
    extendSession
  } = useBilliardStore();

  useEffect(() => {
    // 初始化腾讯云语音识别服务
    speechService.current = TencentSpeechService.getInstance();
    
    // 设置事件监听器
    speechService.current.setEventListeners({
      onResult: handleRecognitionResult,
      onError: handleRecognitionError,
      onStart: () => {
        setIsListening(true);
        setError(null);
        startRecordingTimer();
      },
      onEnd: () => {
        setIsListening(false);
        stopRecordingTimer();
      }
    });

    return () => {
      if (speechService.current) {
        speechService.current.stopRecognition();
      }
      stopRecordingTimer();
    };
  }, []);

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const handleRecognitionResult = (result: RecognitionResult) => {
    console.log('语音识别结果:', result);
    
    if (result.text) {
      setTranscript(result.text);
      setConfidence(result.confidence || 0);
      
      // 处理识别结果
      processRecognitionResult(result.text);
      
      // 回调给父组件
      if (onResult) {
        onResult(result.text);
      }
    }
  };

  const handleRecognitionError = (error: string) => {
    console.error('语音识别错误:', error);
    setError(error);
    setIsListening(false);
    stopRecordingTimer();
  };

  const processRecognitionResult = async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    
    try {
      console.log('处理语音识别结果:', text);
      
      // 使用通义千问处理自然语言
      const qwenService = QwenServiceSimple.getInstance();
      const systemPrompt = `你是一个台球厅收银系统的AI助手。请分析用户的语音指令并返回JSON格式的操作指令。

可用操作类型：
- start_table: 开台 (需要参数: tableId, duration, customerName)
- stop_table: 结账 (需要参数: tableId)
- resume_table: 续时 (需要参数: tableId, duration)
- query_status: 查询状态

请返回格式：
{
  "action": "操作类型",
  "parameters": {"tableId": "台号", "duration": 小时数, "customerName": "客户名"},
  "message": "操作说明"
}

如果无法识别指令，返回：
{
  "action": null,
  "message": "抱歉，我没有理解您的指令"
}`;

      const response = await qwenService.chat(text, systemPrompt);
      
      if (response.success && response.content) {
        try {
          const parsedResponse = JSON.parse(response.content);
          
          if (parsedResponse.action) {
            // 执行识别到的操作
            await executeAction(parsedResponse.action, parsedResponse.parameters);
            
            // 语音反馈
            if (parsedResponse.message) {
              console.log('操作成功:', parsedResponse.message);
              // TODO: 添加语音合成功能
            }
          } else {
            const errorMsg = parsedResponse.message || '抱歉，我没有理解您的指令，请重新说一遍。';
            console.warn('指令未识别:', errorMsg);
            setError(errorMsg);
          }
        } catch (parseError) {
          console.error('解析AI响应失败:', parseError);
          setError('AI响应解析失败，请重试');
        }
      } else {
        const errorMsg = response.error || '抱歉，AI服务暂时不可用，请重新说一遍。';
        console.warn('AI服务错误:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('处理语音指令失败:', error);
      const errorMsg = '处理语音指令时出现错误，请重试。';
      console.error('处理错误:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async (action: string, parameters: any) => {
    try {
      switch (action) {
        case 'start_table':
          if (parameters.tableId && parameters.duration) {
            // 根据tableId找到对应的台桌
            const table = tables.find(t => t.name === `${parameters.tableId}号台`);
            if (table) {
              await openTable(table.id, parameters.duration || 1, parameters.customerName || `客户${Date.now()}`, parameters.phone);
            }
          }
          break;
        case 'stop_table':
          if (parameters.tableId) {
            const table = tables.find(t => t.name === `${parameters.tableId}号台`);
            if (table) {
              await closeTable(table.id);
            }
          }
          break;
        case 'resume_table':
          if (parameters.tableId && parameters.duration) {
            const table = tables.find(t => t.name === `${parameters.tableId}号台`);
            if (table) {
              await extendSession(table.id, parameters.duration);
            }
          }
          break;
        case 'query_status':
          // 查询状态通过语音反馈处理
          console.log('查询台桌状态');
          break;
        default:
          console.warn('未知操作:', action);
      }
    } catch (error) {
      console.error('执行操作失败:', error);
      setError('操作执行失败');
    }
  };

  const startListening = async () => {
    if (!speechService.current) {
      setError('语音识别服务未初始化');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setConfidence(0);
      
      await speechService.current.startRecognition();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setError('启动语音识别失败，请检查麦克风权限');
    }
  };

  const stopListening = () => {
    if (speechService.current) {
      speechService.current.stopRecognition();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      setError('不支持的音频格式，请上传 WAV、MP3、M4A 或 OGG 格式的文件');
      return;
    }

    // 检查文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('音频文件过大，请上传小于 10MB 的文件');
      return;
    }

    setAudioFile(file);
    setError(null);

    try {
      setIsProcessing(true);
      
      if (speechService.current) {
        // 使用阿里云语音识别处理音频文件
        await speechService.current.recognizeAudioFile(file);
      }
    } catch (error) {
      console.error('音频文件识别失败:', error);
      setError('音频文件识别失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (isListening) return 'default';
    if (transcript) return 'secondary';
    return 'outline';
  };

  const getStatusText = () => {
    if (error) return '识别错误';
    if (isProcessing) return '处理中...';
    if (isListening) return `录音中 ${formatDuration(recordingDuration)}`;
    if (transcript) return '识别完成';
    return '待机中';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          腾讯云语音识别
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 状态显示 */}
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
          {confidence > 0 && (
            <Badge variant="outline">
              置信度: {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>

        {/* 录音控制 */}
        <div className="flex gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            variant={isListening ? "destructive" : "default"}
            className="flex-1"
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                停止录音
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                开始录音
              </>
            )}
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isListening}
            variant="outline"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>

        {/* 文件上传 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* 识别结果 */}
        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">识别结果:</p>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {/* 上传的文件信息 */}
        {audioFile && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium mb-1">音频文件:</p>
            <p className="text-sm text-muted-foreground">{audioFile.name}</p>
            <p className="text-xs text-muted-foreground">
              大小: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 点击"开始录音"进行实时语音识别</p>
          <p>• 点击上传按钮选择音频文件识别</p>
          <p>• 支持自然语言指令，如"开始1号台"</p>
          <p>• 支持 WAV、MP3、PCM、M4A 等格式</p>
          <p>• 使用腾讯云一句话识别技术</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceRecognition;