/**
 * 通义千问服务 - 简化版
 * 直接使用HTTP请求调用通义千问API
 */

export interface QwenMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenResponse {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface QwenConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export class QwenServiceSimple {
  private static instance: QwenServiceSimple | null = null;
  private config: Required<QwenConfig>;
  private apiKey: string | null = null;

  private constructor() {
    this.config = {
      model: "qwen-turbo",
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.8,
    };
    this.initializeApiKey();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): QwenServiceSimple {
    if (!QwenServiceSimple.instance) {
      QwenServiceSimple.instance = new QwenServiceSimple();
    }
    return QwenServiceSimple.instance;
  }

  /**
   * 初始化API密钥
   */
  private initializeApiKey(): void {
    // 通过代理服务器处理API密钥，前端不需要直接访问
    this.apiKey = "proxy-handled";
    console.log("✅ 通义千问服务已初始化，通过代理服务器处理API调用");
  }

  /**
   * 通过代理服务器发送消息到通义千问
   */
  async sendMessage(
    messages: QwenMessage[],
    config?: Partial<QwenConfig>
  ): Promise<QwenResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        content: "",
        error: "API密钥未配置",
      };
    }

    try {
      // 合并配置
      const requestConfig = { ...this.config, ...config };

      // 构建请求参数
      const requestBody = {
        model: requestConfig.model,
        input: {
          messages: messages,
        },
        parameters: {
          temperature: requestConfig.temperature,
          max_tokens: requestConfig.max_tokens,
          top_p: requestConfig.top_p,
          result_format: "message",
        },
      };

      console.log("📤 发送通义千问请求:", {
        model: requestConfig.model,
        messages: messages.length,
        temperature: requestConfig.temperature,
      });

      // 通过代理服务器调用API
      const response = await fetch("http://localhost:3001/api/qwen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API调用失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("📥 通义千问响应:", result);

      if (result.output?.choices?.[0]?.message?.content) {
        const content = result.output.choices[0].message.content;
        const usage = result.usage;

        return {
          success: true,
          content: content,
          usage: usage
            ? {
                input_tokens: usage.input_tokens || 0,
                output_tokens: usage.output_tokens || 0,
                total_tokens: usage.total_tokens || 0,
              }
            : undefined,
        };
      } else if (result.error) {
        return {
          success: false,
          content: "",
          error: result.error,
        };
      } else {
        return {
          success: false,
          content: "",
          error: "未获取到有效响应",
        };
      }
    } catch (error) {
      console.error("❌ 通义千问API调用失败:", error);
      return {
        success: false,
        content: "",
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 简单的文本对话
   */
  async chat(message: string, systemPrompt?: string): Promise<QwenResponse> {
    const messages: QwenMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: message,
    });

    return this.sendMessage(messages);
  }

  /**
   * 台球厅语音指令解析
   */
  async parseTableCommand(voiceText: string): Promise<QwenResponse> {
    const systemPrompt = `你是台球厅收银系统的智能助手。请解析用户的语音指令，识别开台相关的操作。

支持的指令类型：
1. 开台指令：开台、开机器、开个台、我要开台、开3号台、开个3号台等
2. 预约指令：预约台、预约机器、预约3号台等
3. 时长指令：2小时、两个小时、半小时、30分钟等
4. 客户信息：客户张三、张三用、电话13812345678等

请返回JSON格式的解析结果：
{
  "action": "open_table|reservation|unknown",
  "parameters": {
    "tableId": "台桌号(1-8，如果未指定则为null)",
    "duration": "时长(分钟数，默认60)",
    "customerName": "客户姓名(如果有)",
    "customerPhone": "客户电话(如果有)"
  },
  "needConfirm": true/false,
  "response": "友好的回复文本",
  "suggestions": ["建议的台桌号列表(如果需要)"]
}

如果指令不完整，设置needConfirm为true，并在response中询问缺失信息。
如果无法识别为台球厅相关指令，action设为"unknown"。

示例：
用户："开3号台2小时" 
返回：{"action":"open_table","parameters":{"tableId":"3","duration":120},"needConfirm":false,"response":"好的，为您开启3号台2小时"}

用户："我要开台"
返回：{"action":"open_table","parameters":{"tableId":null,"duration":60},"needConfirm":true,"response":"好的，请问您要开几号台？","suggestions":["1号台","2号台","3号台"]}`;

    return this.chat(voiceText, systemPrompt);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QwenConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): QwenConfig {
    return { ...this.config };
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.startsWith("sk-");
  }

  /**
   * 更新API密钥
   */
  updateApiKey(newApiKey: string): void {
    this.apiKey = newApiKey;
    if (newApiKey && !newApiKey.startsWith("sk-")) {
      console.warn("⚠️ API密钥格式可能不正确，应该以sk-开头");
    }
  }
}

export default QwenServiceSimple;
