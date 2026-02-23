#!/usr/bin/env node

import { findUserByUsername } from '../database.js';
import { getInstanceStatus } from '../pm2-manager.js';
import net from 'net';

/**
 * 诊断代理连接问题的脚本
 */
async function diagnoseProxyIssue() {
    const username = process.argv[2];
    
    if (!username) {
        console.log('用法: node diagnose-proxy-issue.js <username>');
        console.log('例如: node diagnose-proxy-issue.js 123456');
        process.exit(1);
    }
    
    console.log('='.repeat(60));
    console.log(`🔍 诊断用户 ${username} 的代理连接问题`);
    console.log('='.repeat(60));
    
    // 1. 检查用户是否存在
    console.log('\n📋 Step 1: 检查用户信息...');
    const user = findUserByUsername(username);
    
    if (!user) {
        console.log(`❌ 用户 ${username} 不存在`);
        process.exit(1);
    }
    
    console.log(`✅ 用户信息:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - 用户名: ${user.username}`);
    console.log(`   - 分配端口: ${user.port}`);
    console.log(`   - ST目录: ${user.st_dir || '未设置'}`);
    console.log(`   - 设置状态: ${user.st_setup_status}`);
    
    // 2. 检查端口是否被占用
    console.log('\n🔌 Step 2: 检查端口占用情况...');
    const port = user.port;
    
    if (!port || port === 0) {
        console.log('❌ 用户未分配端口');
        process.exit(1);
    }
    
    const isPortOpen = await checkPort('127.0.0.1', port);
    console.log(`   - 端口 ${port} 状态: ${isPortOpen ? '✅ 开放' : '❌ 关闭'}`);
    
    // 3. 检查PM2实例状态
    console.log('\n🎯 Step 3: 检查PM2实例状态...');
    try {
        const status = await getInstanceStatus(username);
        console.log(`   - PM2状态: ${status.status}`);
        console.log(`   - 进程ID: ${status.pid || '无'}`);
        console.log(`   - 运行时间: ${status.uptime || '未运行'}`);
        console.log(`   - 重启次数: ${status.restarts || 0}`);
    } catch (error) {
        console.log(`   - PM2状态: ❌ 获取失败 - ${error.message}`);
    }
    
    // 4. 提供解决方案
    console.log('\n💡 Step 4: 解决方案建议...');
    
    if (!isPortOpen) {
        console.log('🔧 端口未开放，可能的原因和解决方案:');
        console.log('   1️⃣ ST实例未启动:');
        console.log('      - 登录管理平台，在实例管理页面启动实例');
        console.log('      - 或运行: pm2 start <实例配置>');
        console.log('');
        console.log('   2️⃣ 端口被其他进程占用:');
        console.log(`      - 检查: netstat -tlnp | grep ${port}`);
        console.log(`      - 或者: lsof -i :${port}`);
        console.log('');
        console.log('   3️⃣ frp配置问题:');
        console.log('      - 检查frp客户端配置中的local_port是否正确');
        console.log('      - 确认frp客户端已启动并连接成功');
        console.log('');
        console.log('   4️⃣ 防火墙阻止:');
        console.log('      - 检查本地防火墙设置');
        console.log('      - 确认端口在防火墙中已开放');
    } else {
        console.log('✅ 端口正常开放，检查以下项目:');
        console.log('   - frp配置是否正确映射到此端口');
        console.log('   - 网络连接是否稳定');
        console.log('   - 是否存在代理冲突');
    }
    
    console.log('\n🌐 Step 5: frp配置检查建议...');
    console.log('确保frp客户端配置包含:');
    console.log(`[${username}]`);
    console.log('type = tcp');
    console.log('local_ip = 127.0.0.1');
    console.log(`local_port = ${port}`);
    console.log(`remote_port = <远程端口>`);
    console.log('');
    
    console.log('='.repeat(60));
    console.log('🔍 诊断完成');
    console.log('='.repeat(60));
}

// 检查端口是否开放的辅助函数
function checkPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        
        const timeout = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, 3000);
        
        socket.connect(port, host, () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
        });
    });
}

// 如果直接运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    diagnoseProxyIssue().catch(console.error);
}
