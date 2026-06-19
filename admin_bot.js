const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { VM } = require('vm2');

class AdminBot {
    constructor() {
        this.uploadsDir = path.join(__dirname, 'public', 'uploads', 'chat');
        this.processedFiles = new Set();
        this.checkInterval = 7000;
        this.isRunning = true;
        
        this.adminEmail = 'Alyssia567Administration@logitech.ru';
        this.adminPassword = 'HMWD%k7=1AY#yonDS~ajbCb;t${?lE';
        
        this.cookies = {};
        
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    
    async loginAsAdmin() {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                email: this.adminEmail,
                password: this.adminPassword,
                remember: true
            });
            
            const options = {
                hostname: 'localhost',
                port: 80,
                path: '/api/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                
                const setCookie = res.headers['set-cookie'];
                if (setCookie) {
                    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                    cookies.forEach(cookie => {
                        const match = cookie.match(/([^=]+)=([^;]+)/);
                        if (match) {
                            const cookieName = match[1];
                            const cookieValue = match[2];
                            const isHttpOnly = cookie.includes('HttpOnly');
                            
                            this.cookies[cookieName] = {
                                value: cookieValue,
                                httpOnly: isHttpOnly
                            };
                        }
                    });
                }
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.success) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (err) {
                        resolve(false);
                    }
                });
            });
            
            req.on('error', () => resolve(false));
            req.write(postData);
            req.end();
        });
    }
    
    async executeJavaScript(jsCode, htmlContent, fileName) {
        let documentCookie = '';
        
        for (const [name, cookieData] of Object.entries(this.cookies)) {
            if (!cookieData.httpOnly) {
                documentCookie += `${name}=${cookieData.value}; `;
            }
        }
        documentCookie = documentCookie.trim();
        
        const fetchResponses = [];
        
        const fakeFetch = async (url, options = {}) => {
            if (options.body && options.body.toString().includes('document.cookie')) {
                const actualBody = options.body.toString().replace('document.cookie', documentCookie);
                
                try {
                    await this.makeRealRequest(url, options.method || 'POST', actualBody);
                    fetchResponses.push({ url, success: true });
                } catch (err) {
                    fetchResponses.push({ url, success: false });
                }
            } else {
                try {
                    await this.makeRealRequest(url, options.method || 'GET', options.body);
                    fetchResponses.push({ url, success: true });
                } catch (err) {
                    fetchResponses.push({ url, success: false });
                }
            }
        };
        
        const fakeImage = function() {
            return {
                set src(url) {
                    this._src = url;
                },
                get src() {
                    return this._src;
                }
            };
        };
 
        class FakeXMLHttpRequest {
            constructor() {
                this.readyState = 0;
                this.status = 0;
                this.responseText = '';
            }
            
            open(method, url) {
                this.method = method;
                this.url = url;
            }
            
            send(body) {
                if (body && body.toString().includes('document.cookie')) {
                    const actualBody = body.toString().replace('document.cookie', documentCookie);
                    this.makeRequest(this.url, this.method, actualBody);
                } else {
                    this.makeRequest(this.url, this.method, body);
                }
            }
            
            async makeRequest(url, method, body) {
                try {
                    const response = await this.constructor.parent.makeRealRequest(url, method, body);
                    this.status = response.status;
                    this.readyState = 4;
                    if (this.onload) this.onload();
                } catch (err) {
                    if (this.onerror) this.onerror(err);
                }
            }
        }
        
        FakeXMLHttpRequest.parent = this;
        
        const vm = new VM({
            timeout: 5000,
            sandbox: {
                fetch: fakeFetch,
                Image: fakeImage,
                XMLHttpRequest: FakeXMLHttpRequest,
                document: {
                    cookie: documentCookie
                },
                window: {
                    fetch: fakeFetch,
                    document: {
                        cookie: documentCookie
                    }
                },
                console: {
                    log: (...args) => {}
                },
                __result: null
            }
        });
        
        try {
            await vm.run(`
                try {
                    ${jsCode}
                    __result = { executed: true, fetchCount: ${fetchResponses.length} };
                } catch(e) {
                    __result = { executed: false, error: e.message };
                }
                __result;
            `);
            
            return fetchResponses;
        } catch (err) {
            return [];
        }
    }
    
    async makeRealRequest(url, method, body) {
        return new Promise((resolve, reject) => {
            try {
                const parsedUrl = new URL(url);
                const protocol = parsedUrl.protocol === 'https:' ? https : http;
                
                let cookieString = '';
                for (const [name, cookieData] of Object.entries(this.cookies)) {
                    cookieString += `${name}=${cookieData.value}; `;
                }
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: method,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Cookie': cookieString
                    }
                };
                
                if (body) {
                    options.headers['Content-Length'] = Buffer.byteLength(body);
                }
                
                const req = protocol.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({ status: res.statusCode, data });
                    });
                });
                
                req.on('error', (err) => reject(err));
                
                if (body) {
                    req.write(body);
                }
                req.end();
                
            } catch (err) {
                reject(err);
            }
        });
    }
    
    async processHtmlFile(content, fileName) {
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        let allResponses = [];
        
        while ((match = scriptRegex.exec(content)) !== null) {
            const scriptContent = match[1].trim();
            if (scriptContent) {
                const responses = await this.executeJavaScript(scriptContent, content, fileName);
                allResponses.push(...responses);
            }
        }
        
        const eventRegex = /on(load|click|error|mouseover)\s*=\s*['"]([^'"]+)['"]/gi;
        while ((match = eventRegex.exec(content)) !== null) {
            const eventCode = match[2];
            if (eventCode.includes('fetch') || eventCode.includes('cookie')) {
                const responses = await this.executeJavaScript(eventCode, content, fileName);
                allResponses.push(...responses);
            }
        }
        
        return allResponses;
    }
    
    async openFile(filePath, fileName) {
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(fileName).toLowerCase();
        
        let responses = [];
        
        if (ext === '.html' || ext === '.htm') {
            responses = await this.processHtmlFile(content, fileName);
        } else if (ext === '.js') {
            responses = await this.executeJavaScript(content, null, fileName);
        }
        
        await this.sleep(1500);
    }
    
    getFiles() {
        try {
            if (!fs.existsSync(this.uploadsDir)) return [];
            return fs.readdirSync(this.uploadsDir).filter(file => {
                const filePath = path.join(this.uploadsDir, file);
                return fs.statSync(filePath).isFile();
            });
        } catch (err) {
            return [];
        }
    }
    
    loadProcessedFiles() {
        try {
            const logFile = path.join(__dirname, 'processed_files.json');
            if (fs.existsSync(logFile)) {
                const data = fs.readFileSync(logFile, 'utf8');
                this.processedFiles = new Set(JSON.parse(data));
            }
        } catch (err) {}
    }
    
    saveProcessedFiles() {
        const logFile = path.join(__dirname, 'processed_files.json');
        fs.writeFileSync(logFile, JSON.stringify([...this.processedFiles]));
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async watchDirectory() {
        let cycleCount = 0;
        
        while (this.isRunning) {
            const files = this.getFiles();
            const newFiles = files.filter(f => !this.processedFiles.has(f));
            
            if (newFiles.length > 0) {
                for (const file of newFiles) {
                    const filePath = path.join(this.uploadsDir, file);
                    await this.sleep(500);
                    await this.openFile(filePath, file);
                    this.processedFiles.add(file);
                    this.saveProcessedFiles();
                }
            }
            
            await this.sleep(this.checkInterval);
        }
    }
    
    async start() {
        const loggedIn = await this.loginAsAdmin();
        if (!loggedIn) {
            setTimeout(() => this.start(), 10000);
            return;
        }
        
        this.loadProcessedFiles();
        await this.watchDirectory();
    }
    
    stop() {
        this.isRunning = false;
    }
}

const bot = new AdminBot();
bot.start().catch(() => {});

process.on('SIGINT', () => {
    bot.stop();
    process.exit();
});