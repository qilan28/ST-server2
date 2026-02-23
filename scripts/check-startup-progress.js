#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { findUserByUsername } from '../database.js';

const execAsync = promisify(exec);

/**
 * 检查SillyTavern实例启动进度
 */
async function checkStartupProgress() {
    const username = process.argv[2];
    
    if (!username) {
        console.log('用法: node check-startup-progress.js <username>');
        console.log('例如: node check-startup-progress.js 123456');
        process.exit(1);
    }
    
    console.log('='.repeat(60));
    console.log(`🚀 检查用户 ${username} 的SillyTavern启动进度`);
    console.log('='.repeat(60));
    
    // 检查用户信息
    const user = findUserByUsername(username);
    if (!user || !user.port) {
        console.log(`❌ 用户 ${username} 不存在或未分配端口`);
        process.exit(1);
    }
    
    console.log(`👤 用户: ${username}, 端口: ${user.port}`);
    console.log('');
    
    // 检查PM2进程状态
    console.log('📋 Step 1: 检查PM2进程状态...');
    try {
        const { stdout } = await execAsync(`pm2 show st-${username} --no-color`);
        console.log('✅ PM2进程信息:');
        
        // 提取关键信息
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes('status') || 
                line.includes('uptime') || 
                line.includes('restarts') ||
                line.includes('memory') ||
                line.includes('pid')) {
                console.log(`   ${line.trim()}`);
            }
        }
    } catch (error) {
        console.log(`❌ 无法获取PM2信息: ${error.message}`);
    }
    
    console.log('\n🔍 Step 2: 分析启动日志...');
    try {
        const { stdout } = await execAsync(`pm2 logs st-${username} --lines 20 --no-color`);
        const logs = stdout.split('\n');
        
        // 检查启动阶段
        const startupStages = [
            { keyword: 'Compiling frontend libraries', stage: '编译前端库', status: false },
            { keyword: 'Server listening', stage: '端口监听', status: false },
            { keyword: 'running at http', stage: '服务就绪', status: false },
            { keyword: 'Frontend compiled', stage: '前端编译完成', status: false }
        ];
        
        for (const log of logs) {
            for (const stage of startupStages) {
                if (log.includes(stage.keyword)) {
                    stage.status = true;
                }
            }
        }
        
        console.log('📊 启动进度:');
        for (const stage of startupStages) {
            const status = stage.status ? '✅' : '⏳';
            console.log(`   ${status} ${stage.stage}`);
        }
        
        // 检查是否有错误
        const errorLogs = logs.filter(log => 
            log.toLowerCase().includes('error') || 
            log.toLowerCase().includes('failed') ||
            log.toLowerCase().includes('cannot')
        );
        
        if (errorLogs.length > 0) {
            console.log('\n❌ 发现错误日志:');
            for (const errorLog of errorLogs) {
                console.log(`   ${errorLog}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ 无法获取日志: ${error.message}`);
    }
    
    // 检查端口是否开放
    console.log('\n🔌 Step 3: 检查端口状态...');
    const isPortOpen = await checkPort('127.0.0.1', user.port);
    console.log(`   端口 ${user.port}: ${isPortOpen ? '✅ 已开放' : '❌ 未开放'}`);
    
    // 提供建议
    console.log('\n💡 Step 4: 建议操作...');
    if (!isPortOpen) {
        console.log('🔧 端口未开放，可能的解决方案:');
        console.log('   1️⃣ 如果是首次启动，请耐心等待2-5分钟');
        console.log('   2️⃣ 如果启动超过10分钟，可能需要重启:');
        console.log(`      pm2 restart st-${username}`);
        console.log('   3️⃣ 查看完整日志排查错误:');
        console.log(`      pm2 logs st-${username} --lines 100`);
        console.log('   4️⃣ 如果反复启动失败:');
        console.log('      - 检查磁盘空间是否充足');
        console.log('      - 检查SillyTavern目录权限');
        console.log('      - 检查config.yaml配置是否正确');
    } else {
        console.log('✅ 端口已开放，实例应该正在正常运行');
        console.log(`   访问地址: http://127.0.0.1:${user.port}`);
    }
    
    console.log('\n⏰ 实时监控命令:');
    console.log(`   pm2 logs st-${username} -f`);
    console.log('');
}

// 检查端口的辅助函数
async function checkPort(host, port) {
    return new Promise((resolve) => {
        const net = require('net');
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
    checkStartupProgress().catch(console.error);
}
