@echo off
echo 🚀 启动台球厅收银系统...
echo 📡 启动代理服务器...

REM 后台启动代理服务器
start /B node proxy-server-qwen-sdk.cjs

echo ✅ 代理服务器已启动
echo 🌐 启动前端开发服务器...

REM 启动前端服务器
npm run dev

echo ✅ 所有服务已停止