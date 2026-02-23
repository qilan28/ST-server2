#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成统一端口的 Nginx 配置
 * 所有请求都转发到3000端口，由Express服务器处理路由分发
 */
async function generateUnifiedNginxConfig() {
    try {
        console.log('='.repeat(50));
        console.log('开始生成统一端口 Nginx 配置...');
        console.log('='.repeat(50));
        
        // 从配置中获取域名和端口
        let MAIN_DOMAIN, NGINX_PORT;
        
        try {
            const { getNginxConfig } = await import('../utils/config-manager.js');
            const nginxConfig = getNginxConfig();
            
            MAIN_DOMAIN = nginxConfig.domain || 'localhost';
            NGINX_PORT = nginxConfig.port || 80;
        } catch (err) {
            console.error('警告: 获取 nginx 配置失败:', err.message);
            console.log('使用默认配置');
            MAIN_DOMAIN = 'localhost';
            NGINX_PORT = 80;
        }
        
        console.log(`域名: ${MAIN_DOMAIN}, 端口: ${NGINX_PORT}`);
        
        // 读取模板文件
        const templatePath = path.join(__dirname, '../nginx/nginx-simple-unified.conf.template');
        const outputPath = path.join(__dirname, '../nginx/nginx-unified.conf');
        
        if (!fs.existsSync(templatePath)) {
            throw new Error(`模板文件不存在: ${templatePath}`);
        }
        
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // 替换配置变量
        template = template.replace(/\{\{MAIN_DOMAIN\}\}/g, MAIN_DOMAIN);
        template = template.replace(/\{\{NGINX_PORT\}\}/g, NGINX_PORT);
        
        // 添加生成时间注释
        const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        const header = `# 此文件由脚本自动生成，请勿手动编辑
# 生成时间: ${timestamp}
# 架构: 统一端口版本 - 所有请求转发到Express服务器(3000端口)
# 模式: Nginx -> Express (3000) -> 内部路由分发

`;
        
        const finalConfig = header + template;
        
        // 写入配置文件
        fs.writeFileSync(outputPath, finalConfig, 'utf8');
        
        console.log('✅ 统一端口 Nginx 配置生成成功!');
        console.log(`📄 配置文件: ${outputPath}`);
        console.log('');
        console.log('📋 配置摘要:');
        console.log(`   - 监听端口: ${NGINX_PORT}`);
        console.log(`   - 服务器域名: ${MAIN_DOMAIN}`);
        console.log(`   - 后端服务: 127.0.0.1:3000 (Express)`);
        console.log(`   - 架构类型: 统一端口代理`);
        console.log('');
        console.log('🔄 架构说明:');
        console.log('   外部访问 → Nginx → Express服务器(3000端口)');
        console.log('                      ├── 管理平台路由');
        console.log('                      └── ST实例代理路由');
        console.log('');
        console.log('📝 部署说明:');
        console.log('1. 安装 http-proxy-middleware 依赖:');
        console.log('   npm install http-proxy-middleware');
        console.log('');
        console.log('2. 重启Express服务器:');
        console.log('   npm start');
        console.log('');
        console.log('3. 部署nginx配置:');
        console.log('   sudo cp nginx-unified.conf /etc/nginx/sites-available/sillytavern-unified');
        console.log('   sudo ln -sf /etc/nginx/sites-available/sillytavern-unified /etc/nginx/sites-enabled/');
        console.log('   sudo nginx -t && sudo systemctl reload nginx');
        console.log('');
        console.log('4. 移除旧的多端口配置 (可选):');
        console.log('   sudo rm -f /etc/nginx/sites-enabled/sillytavern');
        console.log('');
        
        return outputPath;
        
    } catch (error) {
        console.error('❌ 生成配置失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    generateUnifiedNginxConfig();
}

export { generateUnifiedNginxConfig };
