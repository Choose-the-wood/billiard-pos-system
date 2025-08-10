#!/bin/bash

echo "🚀 启动台球厅收银系统..."
echo "📡 启动代理服务器..."

# 后台启动代理服务器
node proxy-server-qwen-sdk.cjs &
PROXY_PID=$!

echo "✅ 代理服务器已启动 (PID: $PROXY_PID)"
echo "🌐 启动前端开发服务器..."

# 启动前端服务器
npm run dev

# 当前端服务器停止时，也停止代理服务器
echo "🛑 停止代理服务器..."
kill $PROXY_PID 2>/dev/null
echo "✅ 所有服务已停止"