import { getLocalNetworkIP, getAllLocalNetworkIPs } from './utils/network-helper.js';
import { generateAccessUrl } from './utils/url-helper.js';

console.log('=== 网络功能测试 ===');

// 测试获取内网IP
console.log('\n1. 测试获取主内网IP:');
const localIP = getLocalNetworkIP();
if (localIP) {
    console.log(`   主内网IP: ${localIP}`);
} else {
    console.log('   未检测到内网IP');
}

// 测试获取所有内网IP
console.log('\n2. 测试获取所有内网IP:');
const allIPs = getAllLocalNetworkIPs();
if (allIPs.length > 0) {
    console.log(`   检测到 ${allIPs.length} 个内网IP:`);
    allIPs.forEach(({ ip, interface: interfaceName }) => {
        console.log(`   - ${ip} (${interfaceName})`);
    });
} else {
    console.log('   未检测到任何内网IP');
}

// 测试访问地址生成 (直接端口模式)
console.log('\n3. 测试访问地址生成 (直接端口模式):');
const testUser = 'testuser';
const testPort = 3001;

try {
    const accessData = generateAccessUrl(testUser, testPort);
    console.log(`   主访问地址: ${accessData.mainUrl}`);
    
    if (accessData.alternativeUrls.length > 0) {
        console.log(`   备用地址 (${accessData.alternativeUrls.length}个):`);
        accessData.alternativeUrls.forEach((urlInfo, index) => {
            const status = urlInfo.isActive ? '✓' : '✗';
            const label = urlInfo.label || urlInfo.type || '未知';
            console.log(`   ${index + 1}. [${status}] ${label}: ${urlInfo.url}`);
        });
    } else {
        console.log('   无备用地址');
    }
} catch (error) {
    console.error('   生成访问地址失败:', error.message);
}

console.log('\n=== 测试完成 ===');
