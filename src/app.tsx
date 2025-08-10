import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Mic, Calculator, Bot, Clock, Users, DollarSign } from 'lucide-react';
import { VoiceRecognition } from './components/VoiceRecognition';
import QwenChat from './components/QwenChat';
import { useBilliardStore } from './store';
import './globals.css';

function App() {
  const { tables, openTable, closeTable, extendSession, error, setError } = useBilliardStore();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // 计算统计数据
  const activeTables = tables?.filter(table => table?.isOccupied) || [];
  const totalRevenue = tables?.reduce((sum, table) => sum + (table?.totalAmount || 0), 0) || 0;

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('应用错误:', error);
      // 3秒后自动清除错误
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  // 安全检查
  if (!tables || tables.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">正在加载台球厅系统...</h2>
          <p className="text-muted-foreground">请稍候</p>
        </div>
      </div>
    );
  }

  const handleOpenTable = async (tableId: string) => {
    try {
      await openTable(tableId, 1, `客户${Date.now()}`);
    } catch (error) {
      console.error('开台失败:', error);
    }
  };

  const handleCloseTable = async (tableId: string) => {
    try {
      await closeTable(tableId);
    } catch (error) {
      console.error('结账失败:', error);
    }
  };

  const handleExtendSession = async (tableId: string) => {
    try {
      await extendSession(tableId, 1);
    } catch (error) {
      console.error('续时失败:', error);
    }
  };

  const formatTime = (date: Date | null | string) => {
    if (!date) return '--:--';
    
    // 确保date是Date对象
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // 检查是否是有效的日期
    if (isNaN(dateObj.getTime())) return '--:--';
    
    return dateObj.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">台球厅收银系统</h1>
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              活跃台桌: {activeTables.length}/{tables.length}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              今日营收: ¥{totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>

        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              语音开台
            </TabsTrigger>
            <TabsTrigger value="cashier" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              收银台
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI助手
            </TabsTrigger>
          </TabsList>

          {/* 语音开台界面 */}
          <TabsContent value="voice" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">智能语音开台</h2>
              <p className="text-muted-foreground">
                使用语音指令快速开台，支持"开3号台"、"随便开个台"等自然语言
              </p>
            </div>
            
            <div className="flex justify-center">
              <VoiceRecognition />
            </div>

            {/* 台桌状态概览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((table) => (
                <Card key={table.id} className={`cursor-pointer transition-colors ${
                  table.isOccupied ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                }`}>
                  <CardContent className="p-4 text-center">
                    <div className="font-semibold">{table.name}</div>
                    <Badge variant={table.isOccupied ? 'destructive' : 'secondary'} className="mt-2">
                      {table.isOccupied ? '使用中' : '空闲'}
                    </Badge>
                    {table.isOccupied && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div>{table.customerName}</div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(table.startTime)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 收银台界面 */}
          <TabsContent value="cashier" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">收银台管理</h2>
              <p className="text-muted-foreground">
                管理台桌状态，处理开台、结账、续时等操作
              </p>
            </div>

            <div className="grid gap-4">
              {tables.map((table) => (
                <Card key={table.id} className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <Badge variant={table.isOccupied ? 'destructive' : 'secondary'}>
                        {table.isOccupied ? '使用中' : '空闲'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {table.isOccupied ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">客户:</span>
                            <span className="ml-2 font-medium">{table.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">开始时间:</span>
                            <span className="ml-2 font-medium">{formatTime(table.startTime)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">已用时长:</span>
                            <span className="ml-2 font-medium">{formatDuration(table.duration)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">当前费用:</span>
                            <span className="ml-2 font-medium text-green-600">¥{table.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleExtendSession(table.id)}
                            variant="outline" 
                            size="sm"
                          >
                            续时1小时
                          </Button>
                          <Button 
                            onClick={() => handleCloseTable(table.id)}
                            variant="destructive" 
                            size="sm"
                          >
                            结账
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">台桌空闲</span>
                        <Button 
                          onClick={() => handleOpenTable(table.id)}
                          size="sm"
                        >
                          开台
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI助手界面 */}
          <TabsContent value="ai" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">AI智能助手</h2>
              <p className="text-muted-foreground">
                通义千问AI助手，帮助您处理各种台球厅管理问题
              </p>
            </div>
            
            <QwenChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;