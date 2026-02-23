import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { findUserByUsername } from '../database.js';

const router = express.Router();

// ST实例代理中间件
const createSTProxy = (username) => {
    return createProxyMiddleware({
        target: `http://127.0.0.1`, // 基础目标
        router: (req) => {
            // 动态获取用户端口
            const user = findUserByUsername(username);
            if (!user || !user.port) {
                console.error(`[Proxy] 用户 ${username} 不存在或未分配端口`);
                return null;
            }
            return `http://127.0.0.1:${user.port}`;
        },
        pathRewrite: (path, req) => {
            // 移除用户前缀，例如 /user1/st/api/chat -> /api/chat
            const prefix = `/${username}/st`;
            if (path.startsWith(prefix)) {
                const newPath = path.substring(prefix.length) || '/';
                console.log(`[Proxy] 路径重写: ${path} -> ${newPath}`);
                return newPath;
            }
            return path;
        },
        changeOrigin: true,
        ws: true, // WebSocket支持
        timeout: 60000,
        proxyTimeout: 60000,
        // 禁用缓冲以支持流式响应
        buffer: false,
        // 设置请求头
        onProxyReq: (proxyReq, req, res) => {
            // 添加用户上下文Cookie
            proxyReq.setHeader('Cookie', `${req.headers.cookie || ''}; st_context=${username}`);
            
            // 添加原始请求信息
            proxyReq.setHeader('X-Original-Host', req.headers.host);
            proxyReq.setHeader('X-Forwarded-For', req.connection.remoteAddress);
            proxyReq.setHeader('X-ST-User', username);
        },
        // 处理响应
        onProxyRes: (proxyRes, req, res) => {
            // 设置用户上下文Cookie
            res.setHeader('Set-Cookie', `st_context=${username}; Path=/; Max-Age=86400; SameSite=Lax`);
        },
        // 错误处理
        onError: (err, req, res) => {
            console.error(`[Proxy] ${username} 代理错误:`, err.message);
            res.status(502).json({
                error: 'ST实例连接失败',
                message: '请检查实例是否正常运行',
                username: username
            });
        },
        // 日志
        logLevel: 'warn'
    });
};

// 动态路由：处理所有用户的ST实例访问
router.use('/:username/st*', (req, res, next) => {
    const { username } = req.params;
    
    // 验证用户存在
    const user = findUserByUsername(username);
    if (!user) {
        return res.status(404).json({ 
            error: '用户不存在',
            username: username 
        });
    }
    
    // 验证用户有分配的端口
    if (!user.port || user.port === 0) {
        return res.status(503).json({ 
            error: 'ST实例未配置',
            message: '请联系管理员分配端口',
            username: username 
        });
    }
    
    // 可选：添加访问控制（如果启用）
    // 这里可以添加权限检查逻辑
    
    console.log(`[Proxy] 代理请求: ${req.originalUrl} -> ${username}:${user.port}`);
    
    // 创建并应用代理中间件
    const proxyMiddleware = createSTProxy(username);
    proxyMiddleware(req, res, next);
});

// WebSocket代理支持
router.ws = (server) => {
    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const pathMatch = url.pathname.match(/^\/(\w+)\/st\//);
        
        if (pathMatch) {
            const username = pathMatch[1];
            const user = findUserByUsername(username);
            
            if (user && user.port) {
                console.log(`[WebSocket] 代理WS连接: ${username}:${user.port}`);
                
                // 这里需要WebSocket代理逻辑
                // 可以使用 http-proxy-middleware 的 ws 选项
                const proxyMiddleware = createSTProxy(username);
                // WebSocket代理会自动处理
            }
        }
    });
};

export default router;
