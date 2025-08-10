import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import QwenServiceSimple from '@/services/qwenServiceSimple';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const QwenChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('你是一个台球厅收银系统的AI助手，请帮助用户处理相关问题。');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const qwenService = QwenServiceSimple.getInstance();

  // 检查API状态
  const checkApiStatus = async () => {
    setIsLoading(true);
    try {
      const response = await qwenService.chat('测试连接', '请简单回复"连接成功"');
      if (response.success) {
        setApiStatus('available');
      } else {
        setApiStatus('unavailable');
        console.error('API测试失败:', response.error);
      }
    } catch (error) {
      setApiStatus('unavailable');
      console.error('API测试异常:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await qwenService.chat(inputMessage, systemPrompt);
      
      if (response.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setApiStatus('available');
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ 错误: ${response.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setApiStatus('unavailable');
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ 系统错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setApiStatus('unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  // 清空对话
  const clearMessages = () => {
    setMessages([]);
  };

  // 获取状态显示
  const getStatusBadge = () => {
    switch (apiStatus) {
      case 'available':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />可用</Badge>;
      case 'unavailable':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />不可用</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            通义千问AI助手
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 系统提示设置 */}
          <div>
            <label className="block text-sm font-medium mb-2">系统提示</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="设置AI助手的角色和行为..."
              className="min-h-[80px]"
            />
          </div>

          {/* API状态检查 */}
          <div className="flex gap-2">
            <Button 
              onClick={checkApiStatus} 
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              检查API状态
            </Button>
            <Button 
              onClick={clearMessages} 
              variant="outline" 
              size="sm"
            >
              清空对话
            </Button>
          </div>

          {/* 对话历史 */}
          <div className="border rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>开始与AI助手对话吧！</p>
                <p className="text-sm mt-1">你可以询问台球厅相关的问题</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <div className="text-sm opacity-70 mb-1">
                        {message.role === 'user' ? '你' : 'AI助手'}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-50 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 消息输入 */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="输入你的问题..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !inputMessage.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* API配置提示 */}
          {apiStatus === 'unavailable' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">API配置问题</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    通义千问API不可用，请检查以下配置：
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                    <li>确保.env文件中的VITE_QWEN_API_KEY是有效的</li>
                    <li>API密钥应该以sk-开头</li>
                    <li>确保代理服务器正在运行</li>
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    请参考 <code>通义千问API配置指南.md</code> 获取正确的API密钥。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QwenChat;