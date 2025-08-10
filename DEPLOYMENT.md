# GitHub Pages 部署指南

## 自动部署配置

本项目已配置GitHub Actions自动部署到GitHub Pages。

### 部署步骤

1. **确保仓库设置正确**
   - 在GitHub仓库设置中启用GitHub Pages
   - 选择"GitHub Actions"作为部署源

2. **推送代码触发部署**
   ```bash
   git add .
   git commit -m "配置GitHub Pages部署"
   git push origin main
   ```

3. **查看部署状态**
   - 在GitHub仓库的"Actions"标签页查看部署进度
   - 部署完成后，访问 `https://[用户名].github.io/billiard-pos-system/`

### 配置说明

- **Base路径**: 生产环境使用 `/billiard-pos-system/` 作为base路径
- **构建工具**: 使用pnpm进行依赖安装和构建
- **部署分支**: main或master分支的推送会触发自动部署

### 本地测试

在推送前，可以在本地测试构建：

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm run build

# 预览构建结果
pnpm run preview
```

### 故障排除

如果遇到404错误：
1. 确保vite.config.ts中的base路径配置正确
2. 检查GitHub Actions部署日志
3. 确认GitHub Pages设置正确

### 手动部署

如果需要手动部署：
1. 运行 `pnpm run build`
2. 将dist目录内容上传到GitHub Pages 