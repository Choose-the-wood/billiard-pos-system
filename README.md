# 🎱 智能台球厅收银系统

一个现代化的台球厅管理系统，集成了语音识别、AI助手和智能开台功能。

## ✨ 核心功能

### 🎤 智能语音开台
- **腾讯云语音识别**：支持中文语音指令
- **自然语言处理**：理解"开3号台"、"随便开个台"等指令
- **通义千问AI解析**：智能解析语音指令并执行相应操作
- **实时反馈**：语音识别结果实时显示

### 💰 收银台管理
- **台桌状态管理**：实时显示所有台桌状态
- **开台操作**：快速开台，记录客户信息
- **结账功能**：自动计算费用，支持多种支付方式
- **续时服务**：灵活的时间延长功能

### 🤖 AI智能助手
- **通义千问集成**：专业的AI对话服务
- **业务咨询**：回答台球厅相关问题
- **智能建议**：提供经营管理建议

## 🚀 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI框架**: Tailwind CSS + Radix UI
- **状态管理**: Zustand
- **语音识别**: 腾讯云语音识别服务
- **AI服务**: 阿里云通义千问
- **后端代理**: Express.js

## 📦 快速开始

### 环境要求
- Node.js >= 16
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 配置API密钥（在 `.env` 文件中）：
```env
# 腾讯云配置
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key

# 通义千问配置
DASHSCOPE_API_KEY=your_dashscope_api_key
```

### 🎯 一键启动（推荐）
```bash
# 使用启动脚本（同时启动前端和代理服务器）
./start.sh        # Mac/Linux
start.bat          # Windows

# 或使用npm脚本
npm start
```

### 手动启动
```bash
# 终端1：启动代理服务器
node proxy-server-qwen-sdk.cjs

# 终端2：启动前端开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用

## 🎮 使用指南

### 语音开台
1. 点击"开始语音识别"按钮
2. 说出指令，例如：
   - "开3号台"
   - "随便开个台"
   - "开VIP台2小时"
3. 系统自动识别并执行操作

### 收银台操作
- **开台**：选择空闲台桌，点击"开台"
- **结账**：选择使用中的台桌，点击"结账"
- **续时**：点击"续时1小时"延长使用时间

### AI助手
- 在AI助手界面与通义千问进行对话
- 询问台球厅管理相关问题
- 获取经营建议和技术支持

## 📁 项目结构

```
billiard-pos-system/
├── src/
│   ├── components/          # React组件
│   │   ├── VoiceRecognition.tsx    # 语音识别组件
│   │   ├── QwenChat.tsx           # AI聊天组件
│   │   └── ui/                    # UI组件库
│   ├── services/           # 服务层
│   │   ├── tencentSpeechService.ts # 腾讯云语音服务
│   │   └── qwenServiceSimple.ts   # 通义千问服务
│   ├── store/              # 状态管理
│   │   └── index.ts        # Zustand store
│   └── App.tsx             # 主应用组件
├── proxy-server-qwen-sdk.cjs  # 代理服务器
├── start.sh                   # 启动脚本(Mac/Linux)
├── start.bat                  # 启动脚本(Windows)
└── README.md
```

## 🔧 API配置指南

### 腾讯云语音识别
1. 登录[腾讯云控制台](https://console.cloud.tencent.com/)
2. 开通语音识别服务
3. 获取SecretId和SecretKey
4. 配置到`.env`文件

### 通义千问API
1. 访问[阿里云DashScope](https://dashscope.aliyun.com/)
2. 创建API Key
3. 配置到`.env`文件

详细配置说明请参考：
- [腾讯云语音服务开通指南](./腾讯云语音服务开通指南.md)
- [通义千问API配置指南](./通义千问API配置指南.md)

## 🌟 特色功能

- ✅ **一键启动**：简化开发和部署流程
- ✅ **语音识别**：支持自然语言指令
- ✅ **AI解析**：智能理解用户意图
- ✅ **实时更新**：台桌状态实时同步
- ✅ **响应式设计**：支持多种设备
- ✅ **错误处理**：完善的异常捕获机制

## 🚀 部署

### 构建生产版本
```bash
npm run build
```

### 部署到服务器
1. 将`dist`目录上传到服务器
2. 配置nginx或其他web服务器
3. 启动代理服务器：`node proxy-server-qwen-sdk.cjs`

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请通过GitHub Issues联系我们。

---

**🎱 让台球厅管理更智能，让服务更贴心！**