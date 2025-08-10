# 通义千问API配置指南

## 🔑 获取正确的API密钥

当前`.env`文件中的API密钥是示例格式，需要替换为真实的密钥。

### 步骤1：访问阿里云DashScope控制台
1. 打开浏览器，访问：https://dashscope.console.aliyun.com/
2. 使用阿里云账号登录（如果没有账号需要先注册）

### 步骤2：开通DashScope服务
1. 如果是首次使用，需要先开通DashScope服务
2. 点击"立即开通"按钮
3. 同意服务协议并完成开通

### 步骤3：创建API密钥
1. 在控制台左侧菜单中，点击"API-KEY管理"
2. 点击"创建新的API-KEY"按钮
3. 输入API-KEY名称（如：billiard-pos-system）
4. 点击"确定"创建
5. **重要**：复制生成的API密钥（以sk-开头的长字符串）

### 步骤4：更新配置文件
将获取到的真实API密钥替换`.env`文件中的示例密钥：

```bash
# 将这行：
VITE_QWEN_API_KEY=sk-f4b8c9d2e1a3f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5

# 替换为真实的API密钥：
VITE_QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔧 当前系统状态

- ✅ 语音识别功能：已正常工作（腾讯云）
- ⚠️ 通义千问功能：需要配置正确的API密钥
- ✅ 代理服务器：已更新错误处理和调试信息

## 🧪 测试步骤

1. 更新API密钥后，重启代理服务器：
   ```bash
   # 停止当前服务器（Ctrl+C）
   # 然后重新启动
   node proxy-server-tencent.cjs
   ```

2. 在前端测试通义千问功能

## 📝 注意事项

- API密钥必须以`sk-`开头
- 密钥长度通常为64个字符
- 请妥善保管API密钥，不要泄露给他人
- 如果密钥无效，会收到"InvalidApiKey"错误

## 🆓 免费额度

通义千问提供一定的免费调用额度，具体额度请查看控制台。