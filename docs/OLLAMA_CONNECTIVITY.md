# 🦙 Ollama Connectivity Guide

## **Acronyms**

**CHM** = Connection Health Monitor (the mini popup that shows connectivity status)

## **Production-Grade Connection Health Monitoring**

This guide covers how Samvada Studio intelligently detects and connects to Ollama across all network scenarios.

---

## **🎯 Problem Statement**

### **The Challenge**
When accessing Samvada Studio from:
- **Desktop/Laptop**: Ollama runs on `localhost:11434` ✅
- **Mobile via LAN**: Ollama is on PC's IP (e.g., `192.168.1.100:11434`) ❌ fails with localhost
- **Remote Server**: Ollama hosted elsewhere with custom configuration ❌ fails
- **Custom Ports/Paths**: Non-standard setups ❌ fails

### **The Solution**
**Spring Boot-style auto-configuration** + **Spring-style manual configuration** = Production-ready Ollama connectivity

---

## **🏗️ Architecture Overview**

### **Two-Layer Configuration System**

#### **Layer 1: Auto-Configuration (Spring Boot Style)**
Automatically discovers Ollama endpoints without user intervention:
1. ✅ Checks cached successful endpoint first (fastest)
2. ✅ Tries current hostname (smart LAN detection)
3. ✅ Tries localhost/127.0.0.1
4. ✅ Scans common LAN IPs (gateway, router)
5. ✅ Tests alternative ports (11435, 8080, 3000, 5000)
6. ✅ Caches successful connection for future use

#### **Layer 2: Manual Configuration (Spring Style)**
Explicit configuration for advanced setups:
1. ✅ Add custom endpoints (host, port, protocol)
2. ✅ Configure HTTPS/authentication
3. ✅ Set base paths for reverse proxies
4. ✅ Multiple endpoints with fallback priority
5. ✅ Import/export configuration

---

## **📱 Use Case Examples**

### **Use Case 1: Mobile Access via LAN**

**Scenario**: You're running Ollama on your PC at `192.168.1.100` and want to access Samvada Studio from your phone.

**Solution Options**:

#### **Option A: Auto-Discovery (Recommended)**
1. Open Samvada Studio on mobile: `http://192.168.1.100:5173`
2. The system automatically detects PC's IP from the URL
3. Tests `http://192.168.1.100:11434` for Ollama
4. ✅ Connection established automatically!

#### **Option B: Manual Configuration**
1. Go to **Admin Panel > Ollama** tab
2. Click "**+ Add Endpoint**"
3. Enter:
   - Host: `192.168.1.100`
   - Port: `11434`
   - Protocol: `HTTP`
   - Label: "My PC"
4. Click "**Run Discovery**"
5. ✅ Connection verified!

### **Use Case 2: Docker Container**

**Scenario**: Ollama running in Docker with port mapping `8080:11434`

**Solution**:
1. Admin Panel > Ollama > Add Endpoint
2. Configure:
   - Host: `localhost`
   - Port: `8080`
   - Label: "Docker Ollama"
3. Discovery will find it automatically

### **Use Case 3: Reverse Proxy (nginx/Apache)**

**Scenario**: Ollama behind nginx at `/api/ollama`

**Solution**:
1. Add custom endpoint:
   - Host: `yourserver.com`
   - Port: `443`
   - Protocol: `HTTPS`
   - Base Path: `/api/ollama`
2. System will probe: `https://yourserver.com:443/api/ollama/api/version`

### **Use Case 4: Multiple Ollama Instances**

**Scenario**: Development + Production Ollama servers

**Solution**:
1. Add multiple endpoints with priorities:
   - `localhost:11434` (Development) - Priority 1
   - `prod.example.com:11434` (Production) - Priority 2
2. Configure fallback behavior:
   - **First Healthy**: Try Priority 1, then Priority 2
   - **Fastest**: Race both, use fastest responder

---

## **🔧 Configuration Options**

### **Auto-Discovery Settings**

```typescript
{
  autoDiscovery: true,  // Enable auto-discovery
  fallbackBehavior: 'first-healthy',  // 'first-healthy' | 'fastest' | 'round-robin'
  cacheSuccessfulEndpoint: true,  // Cache working endpoint
  networkDetection: {
    enableLANScan: true,  // Scan LAN for Ollama
    enablePortScan: true,  // Try alternative ports
   scanTimeout: 300,    // Timeout per endpoint (ms) - reduced default for faster discovery
  },
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  }
}
```

### **Endpoint Configuration**

```typescript
{
  host: '192.168.1.100',  // IP or hostname
  port: 11434,             // Port number
  protocol: 'http',        // 'http' | 'https'
  basePath: '',            // Optional: '/api' for reverse proxy
  apiKey: '',              // Optional: Bearer token
  timeout: 5000,           // Optional: Custom timeout
  priority: 0,             // Lower = higher priority
  label: 'My PC Ollama'    // User-friendly name
}
```

---

## **🚀 Getting Started**

### **Quick Start (Auto-Discovery)**

1. Ensure Ollama is running
2. Open Samvada Studio
3. Auto-discovery runs automatically
4. Check Admin Panel > Ollama for status

### **Manual Configuration**

1. Open **Admin Panel** (gear icon)
2. Click **Ollama** tab
3. Click "**Run Discovery**" to test auto-detection
4. If auto-discovery fails:
   - Click "**+ Add Endpoint**"
   - Enter your Ollama details
   - Click "**Add Endpoint**"
5. Click "**Run Discovery**" again to verify

---

## **🔍 Discovery Algorithm**

The system tests endpoints in this order:

1. **Cached Endpoint** (if previously successful)
   - Fastest response time
   - Skip full discovery if working

2. **User-Configured Endpoints** (priority order)
   - Custom endpoints you've added
   - Tested in priority order

3. **Current Hostname** (smart LAN detection)
   - If accessing via `192.168.1.100:5173`
   - Try `192.168.1.100:11434`

4. **Localhost Defaults**
   - `localhost:11434`
   - `127.0.0.1:11434`

5. **LAN Gateway Candidates** (if enabled)
   - `192.168.1.1:11434`
   - `192.168.1.2:11434`
   - `192.168.1.254:11434`

6. **Alternative Ports** (if enabled)
   - Try ports: 11435, 8080, 3000, 5000
   - Test on localhost + current host

---

## **🛡️ Edge Cases Handled**

### **Network Changes**
- ✅ WiFi to mobile data switching
- ✅ VPN connections
- ✅ IP address changes
- Solution: Run discovery again or enable auto-refresh

### **CORS Issues**
- ✅ Browser security restrictions
- Solution: Ollama needs CORS headers configured

### **Firewall Blocks**
- ✅ Port filtering
- ✅ Network segmentation
- Solution: Add custom endpoint with accessible route

### **Slow Networks**
- ✅ Timeout handling
- ✅ Configurable scan timeout
- Solution: Increase scanTimeout in settings

### **Partial Failures**
- ✅ Some endpoints work, others don't
- Solution: System uses first healthy endpoint

---

## **📊 Health Monitoring Integration**

The Ollama connectivity check is integrated into the **Connection Health Monitor**:

- **Real-time Status**: Visual indicator shows connection health
- **Automatic Testing**: Periodic health checks
- **Failure Alerts**: Notifies when Ollama becomes unavailable
- **Debug Info**: Shows endpoint details, response time, version

**Check in Debug Mode:**
- Press `Ctrl+Shift+D`
- View "Ollama Connectivity" section
- See all tested endpoints and their status

---

## **🔄 Fallback Strategies**

### **First Healthy (Recommended)**
Tests endpoints in priority order, uses first healthy one.

**Pros:**
- Predictable behavior
- Respects priority configuration
- Fast when cached endpoint works

**Use when:**
- You have a preferred endpoint (e.g., localhost)
- You want deterministic selection

### **Fastest**
Races all endpoints, uses fastest responder.

**Pros:**
- Optimal performance
- Automatically adapts to network conditions
- Good for multiple remote servers

**Use when:**
- You have multiple equivalent endpoints
- Performance is critical
- Network conditions vary

### **Round Robin**
Cycles through healthy endpoints evenly.

**Pros:**
- Load balancing
- Distributes requests

**Use when:**
- Running multiple Ollama instances
- Load distribution needed

---

## **💾 Configuration Import/Export**

### **Export Configuration**
1. Admin Panel > Ollama
2. Click "**📥 Export Config**"
3. Save JSON file

### **Import Configuration**
1. Admin Panel > Ollama
2. Click "**📤 Import Config**"
3. Select JSON file
4. Configuration restored

**Use Cases:**
- Share configuration across devices
- Backup settings
- Deploy to multiple environments
- Team configuration management

---

## **🐛 Troubleshooting**

### **Problem: "Ollama not accessible"**

**Solution Steps:**
1. Verify Ollama is running: `ollama list`
2. Check Ollama is listening: `curl http://localhost:11434/api/version`
3. For LAN access:
   - Get PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Add custom endpoint with PC's IP
4. Check firewall rules allow port 11434
5. Run discovery: Admin Panel > Ollama > "Run Discovery"

### **Problem: Works on PC, fails on mobile**

**Solution:**
1. Ensure mobile is on same WiFi network
2. Find PC's local IP (e.g., `192.168.1.100`)
3. Access Samvada: `http://192.168.1.100:5173`
4. Add Ollama endpoint: `192.168.1.100:11434`
5. Run discovery

### **Problem: Discovery is slow**

**Solution:**
1. Disable unnecessary scans:
   - Uncheck "Enable LAN Scan" if not on LAN
   - Uncheck "Enable Port Scan" if using standard port
2. Reduce scan timeout: 2000ms → 1000ms
3. Add known endpoint manually to skip discovery

### **Problem: Configuration not persisting**

**Solution:**
1. Check browser localStorage isn't disabled
2. Check incognito/private mode (doesn't persist)
3. Export configuration as backup
4. Try different browser

---

## **🔬 Advanced Features**

### **Custom Headers & Authentication**

For Ollama instances with authentication:

```typescript
{
  host: 'secure.example.com',
  port: 443,
  protocol: 'https',
  apiKey: 'sk-your-api-key-here',
  label: 'Secure Ollama'
}
```

The system automatically adds: `Authorization: Bearer sk-your-api-key-here`

### **Retry with Exponential Backoff**

Failed connections automatically retry with increasing delays:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 second delay
- Attempt 4: 4 second delay

Configure in Admin Panel > Ollama > Network Detection

### **Health Check Endpoint Override**

System tests `/api/version` by default. For custom setups, configure base path:

```typescript
{
  host: 'custom.example.com',
  basePath: '/custom/ollama'
}
```

Tests: `https://custom.example.com/custom/ollama/api/version`

---

## **📈 Best Practices**

### **For Development**
- ✅ Enable auto-discovery
- ✅ Keep default settings
- ✅ Let system find localhost automatically

### **For Production**
- ✅ Add explicit endpoints
- ✅ Disable LAN/port scanning (security)
- ✅ Use HTTPS with authentication
- ✅ Configure multiple endpoints for failover
- ✅ Export configuration for backup

### **For Mobile/Tablet**
- ✅ Add PC's LAN IP as custom endpoint
- ✅ Use descriptive labels ("Home PC", "Work Server")
- ✅ Enable auto-discovery for smart detection
- ✅ Cache successful endpoint for speed

### **For Team Environments**
- ✅ Export configuration template
- ✅ Share with team members
- ✅ Document custom endpoints
- ✅ Use labels for clarity

---

## **🎓 Technical Deep Dive**

### **Discovery Protocol**

1. **Endpoint Generation**: Create candidate list based on config
2. **Parallel Testing**: Race endpoints (fastest mode) or sequential (priority mode)
3. **Health Verification**: Test `/api/version` endpoint
4. **Response Validation**: Check HTTP status, parse JSON
5. **Result Caching**: Store successful endpoint
6. **Monitoring Integration**: Update health status

### **Timeout Handling**

Uses `AbortController` for clean cancellation:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);
```

### **CORS Handling**

If Ollama doesn't send CORS headers, browser blocks the request. Solutions:
1. **Ollama Configuration**: Add CORS headers to Ollama
2. **Proxy**: Use CORS proxy
3. **Browser Extension**: CORS unlocker (development only)

---

## **🚀 Future Enhancements**

Planned features:
- [ ] mDNS/Bonjour discovery for automatic LAN detection
- [ ] WebSocket connection for real-time health monitoring
- [ ] Load balancing across multiple Ollama instances
- [ ] Connection quality metrics (latency, throughput)
- [ ] Automatic failover with reconnection logic
- [ ] Network topology visualization
- [ ] Mobile-specific optimizations (battery, data usage)

---

## **📚 API Reference**

### **OllamaDiscoveryService**

```typescript
// Discover endpoint
const result = await ollamaDiscovery.discoverEndpoint();

// Add custom endpoint
ollamaDiscovery.addEndpoint({
  host: '192.168.1.100',
  port: 11434,
  protocol: 'http',
  label: 'My Server'
});

// Remove endpoint
ollamaDiscovery.removeEndpoint('192.168.1.100', 11434);

// Get configuration
const config = ollamaDiscovery.getConfiguration();

// Save configuration
ollamaDiscovery.saveConfiguration({ autoDiscovery: false });

// Export configuration
const json = ollamaDiscovery.exportConfiguration();

// Import configuration
ollamaDiscovery.importConfiguration(json);

// Reset all settings
ollamaDiscovery.reset();
```

### **Helper Functions**

```typescript
// Get best endpoint (auto-discovery)
const endpoint = await getOllamaEndpoint();
// Returns: "http://192.168.1.100:11434" or null

// Test specific endpoint
const result = await ollamaDiscovery.testWithRetry(endpoint);
// Returns: HealthResult with status, responseTime, error
```

---

## **🤝 Contributing**

Found a bug or edge case we missed? Please open an issue!

Areas we'd love help with:
- Testing on different network configurations
- Docker/Kubernetes setups
- Cloud provider deployments (AWS, Azure, GCP)
- Enterprise network scenarios
- Mobile device testing

---

**Built with ❤️ for production-grade reliability**
