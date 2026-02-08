// Ollama Discovery Service - Production-Grade Auto-Detection
// Spring Boot-style auto-configuration with intelligent fallbacks

export interface OllamaEndpoint {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  basePath?: string;
  apiKey?: string;
  timeout?: number;
  priority: number; // Lower = higher priority
  label?: string; // User-friendly name
}

export interface OllamaDiscoveryResult {
  endpoint: OllamaEndpoint;
  responseTime: number;
  version?: string;
  models?: string[];
  isHealthy: boolean;
  lastChecked: Date;
  error?: string;
  cancelled?: boolean; // Add cancellation flag
}

export interface OllamaConfiguration {
  autoDiscovery: boolean;
  endpoints: OllamaEndpoint[];
  fallbackBehavior: 'first-healthy' | 'fastest' | 'round-robin';
  cacheSuccessfulEndpoint: boolean;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  networkDetection: {
    enableLANScan: boolean;
    enablePortScan: boolean;
    enableWiFiScan: boolean;
    scanTimeout: number;
    maxConcurrentScans: number; // Limit concurrent requests
    enableSmartScan: boolean; // Smart scanning based on current network
  };
}

// Default configuration (Spring Boot-style defaults)
const DEFAULT_CONFIG: OllamaConfiguration = {
  autoDiscovery: true,
  endpoints: [],
  fallbackBehavior: 'first-healthy',
  cacheSuccessfulEndpoint: true,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
  networkDetection: {
    enableLANScan: true,
    enablePortScan: true,
    enableWiFiScan: true,
    scanTimeout: 2000,
    maxConcurrentScans: 5, // Limit to 5 concurrent requests
    enableSmartScan: true, // Smart scanning enabled by default
  },
};

// Storage key for persisted configuration
const STORAGE_KEY = 'ollama-discovery-config';

class OllamaDiscoveryService {
  private config: OllamaConfiguration;
  private cachedEndpoint: OllamaEndpoint | null = null;
  private discoveryResults: Map<string, OllamaDiscoveryResult> = new Map();
  private lastDiscoveryTime = 0; // Timestamp for debouncing rapid calls
  private abortController: AbortController | null = null; // For cancelling discovery
  private isDiscovering = false; // Track discovery state

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from localStorage (Spring-style external config)
   */
  private loadConfiguration(): OllamaConfiguration {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load Ollama configuration:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfiguration(config: Partial<OllamaConfiguration>): void {
    this.config = { ...this.config, ...config };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save Ollama configuration:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): OllamaConfiguration {
    return { ...this.config };
  }

  /**
   * Validate and normalize a custom Ollama endpoint
   * Ensures proper API conventions are followed
   */
  private validateAndNormalizeEndpoint(endpoint: Omit<OllamaEndpoint, 'priority'>): OllamaEndpoint {
    const normalized: OllamaEndpoint = { ...endpoint, priority: 0 }; // Default priority

    // Validate host
    if (!normalized.host || normalized.host.trim() === '') {
      throw new Error('Host is required');
    }

    // Normalize host (remove protocol if present)
    normalized.host = normalized.host.replace(/^https?:\/\//, '');

    // Validate port
    if (!normalized.port || normalized.port < 1 || normalized.port > 65535) {
      normalized.port = 11434; // Default Ollama port
    }

    // Ensure protocol
    if (!normalized.protocol) {
      normalized.protocol = 'http';
    }

    // Normalize basePath - ensure it starts with / and includes /api if not present
    if (!normalized.basePath) {
      normalized.basePath = '/api';
    } else if (!normalized.basePath.startsWith('/')) {
      normalized.basePath = '/' + normalized.basePath;
    }

    // Ensure basePath includes /api for Ollama API compatibility
    if (!normalized.basePath.includes('/api')) {
      if (normalized.basePath === '/') {
        normalized.basePath = '/api';
      } else {
        normalized.basePath = normalized.basePath.replace(/\/$/, '') + '/api';
      }
    }

    // Validate protocol
    if (!['http', 'https'].includes(normalized.protocol)) {
      normalized.protocol = 'http';
    }

    // Generate a default label if not provided
    if (!normalized.label) {
      normalized.label = `${normalized.protocol}://${normalized.host}:${normalized.port}${normalized.basePath}`;
    }

    return normalized;
  }

  /**
   * Add a custom endpoint (Spring-style manual configuration)
   */
  addEndpoint(endpoint: Omit<OllamaEndpoint, 'priority'>): void {
    const validatedEndpoint = this.validateAndNormalizeEndpoint(endpoint);
    const priority = this.config.endpoints.length;
    const newEndpoint: OllamaEndpoint = { ...validatedEndpoint, priority };
    this.config.endpoints.push(newEndpoint);
    this.saveConfiguration(this.config);
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(host: string, port: number): void {
    this.config.endpoints = this.config.endpoints.filter(
      ep => !(ep.host === host && ep.port === port)
    );
    this.saveConfiguration(this.config);
  }

  /**
   * Clear all custom endpoints
   */
  clearEndpoints(): void {
    this.config.endpoints = [];
    this.cachedEndpoint = null;
    this.discoveryResults.clear();
    this.saveConfiguration(this.config);
  }

  /**
   * Get the full URL for an endpoint
   */
  private getEndpointUrl(endpoint: OllamaEndpoint): string {
    const { protocol, host, port, basePath = '' } = endpoint;
    return `${protocol}://${host}:${port}${basePath}`;
  }

  /**
   * Test if an endpoint is healthy
   */
  private async testEndpoint(endpoint: OllamaEndpoint, abortSignal?: AbortSignal): Promise<OllamaDiscoveryResult> {
    const startTime = Date.now();
    const url = this.getEndpointUrl(endpoint);
    const timeout = endpoint.timeout || this.config.networkDetection.scanTimeout;

    try {
      // Use AbortController for timeout and cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Combine with external abort signal if provided
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => controller.abort());
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (endpoint.apiKey) {
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
      }

      // Try to get Ollama version info
      const response = await fetch(`${url}/api/version`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if cancelled
      if (controller.signal.aborted) {
        return {
          endpoint,
          responseTime: Date.now() - startTime,
          isHealthy: false,
          lastChecked: new Date(),
          error: 'Cancelled',
          cancelled: true,
        };
      }

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          endpoint,
          responseTime,
          version: data.version,
          isHealthy: true,
          lastChecked: new Date(),
        };
      } else {
        return {
          endpoint,
          responseTime,
          isHealthy: false,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Check if this was a cancellation
      if (error.name === 'AbortError' || (this.abortController && this.abortController.signal.aborted)) {
        return {
          endpoint,
          responseTime,
          isHealthy: false,
          lastChecked: new Date(),
          error: 'Cancelled',
          cancelled: true,
        };
      }
      
      return {
        endpoint,
        responseTime,
        isHealthy: false,
        lastChecked: new Date(),
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
      };
    }
  }

  /**
   * Perform comprehensive LAN network scan for Ollama endpoints
   * Scans common ports and IP ranges in the local network
   */
  private async performLANScan(): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    const commonPorts = [11434, 11435, 8080, 3000, 5000]; // Ollama default + common alternatives

    try {
      // Get local network information
      const localIPs = await this.getLocalNetworkIPs();
      const networkRanges = this.generateNetworkRanges(localIPs);

      console.log(`🔍 LAN Scan: Scanning ${networkRanges.length} network ranges with ${commonPorts.length} ports each`);

      // For LAN scan, be more conservative - only scan a few IPs around detected addresses
      // instead of full subnet ranges to avoid overwhelming networks
      for (const networkRange of networkRanges) {
        // Only scan a small range around the detected IP (±2 addresses)
        const baseOctet = networkRange.start;
        const scanRange = [baseOctet - 2, baseOctet - 1, baseOctet, baseOctet + 1, baseOctet + 2]
          .filter(octet => octet >= 1 && octet <= 254);

        for (const octet of scanRange) {
          const ip = `${networkRange.prefix}.${octet}`;
          for (const port of commonPorts) {
            candidates.push({
              host: ip,
              port,
              protocol: 'http',
              priority: 100 + (Math.abs(octet - baseOctet) * 10) + port, // Closer IPs get higher priority
              label: `LAN: ${ip}:${port}`,
            });
          }
        }
      }

      console.log(`📡 Generated ${candidates.length} conservative LAN scan candidates`);
    } catch (error) {
      console.warn('LAN scan failed:', error);
    }

    return candidates;
  }

  /**
   * Get comprehensive local network information for multi-network scanning
   * Enhanced with better fallback mechanisms for out-of-the-box functionality
   */
  private async getLocalNetworkIPs(): Promise<string[]> {
    const networks: string[] = [];
    let webRTCSuccess = false;

    try {
      // Method 1: Enhanced WebRTC-based IP detection with better error handling
      if (typeof window !== 'undefined' && window.RTCPeerConnection) {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          });
          pc.createDataChannel('');

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Wait for ICE candidates with extended timeout for better detection
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => resolve(), 3000); // Increased timeout
            let candidateCount = 0;

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                candidateCount++;
                const candidate = event.candidate.candidate;
                const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (ipMatch && ipMatch[1]) {
                  const ip = ipMatch[1];
                  if (!networks.includes(ip) && !ip.startsWith('127.')) {
                    networks.push(ip);
                    console.log(`🌐 WebRTC detected network IP: ${ip}`);
                    webRTCSuccess = true;
                  }
                }
              } else {
                clearTimeout(timeout);
                resolve();
              }
            };
          });

          pc.close();
        } catch (webRTCError) {
          console.warn('WebRTC IP detection failed:', webRTCError);
        }
      }

      // Method 2: Current hostname analysis with better detection
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          if (!networks.includes(hostname)) {
            networks.push(hostname);
            console.log(`🌐 Detected hostname IP: ${hostname}`);
          }
        }

        // Try to infer local network from current location
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // If running on localhost, likely testing - add common local network IPs
          const commonLocalIPs = ['192.168.1.100', '192.168.0.100', '10.0.0.100'];
          networks.push(...commonLocalIPs.filter(ip => !networks.includes(ip)));
          console.log('🏠 Localhost detected, adding common local network IPs for testing');
        }
      }

      // Method 3: Enhanced common private network ranges with more comprehensive coverage
      const commonSubnets = [
        '192.168.1.0/24',   // Most common home network
        '192.168.0.0/24',   // Alternative home network
        '192.168.2.0/24',   // Another common home network
        '192.168.10.0/24',  // Common router default
        '192.168.100.0/24', // Some ISP networks
        '10.0.0.0/24',      // Private network range
        '10.0.1.0/24',      // Docker networks
        '172.16.0.0/24',    // Private network range
        '172.17.0.0/24',    // Docker networks
        '172.18.0.0/24',    // Docker networks
      ];

      // If we have detected IPs, generate their subnets and add variations
      if (networks.length > 0) {
        for (const detectedIp of networks) {
          const subnet = this.generateSubnetFromIP(detectedIp);
          if (subnet && !commonSubnets.includes(subnet)) {
            commonSubnets.push(subnet);
            // Also add adjacent subnets (common in larger networks)
            const adjacentSubnets = this.generateAdjacentSubnets(subnet);
            commonSubnets.push(...adjacentSubnets.filter(s => !commonSubnets.includes(s)));
          }
        }
      }

      // Method 4: Generate candidate IPs from all subnets with smart selection
      const allCandidateIPs: string[] = [];
      for (const subnet of commonSubnets) {
        const ips = this.generateIPsFromSubnet(subnet);
        allCandidateIPs.push(...ips);
      }

      // Method 5: Add most likely Ollama locations first (prioritize for faster discovery)
      const priorityIPs = [
        'localhost',        // Always check localhost first
        '127.0.0.1',        // IPv4 localhost
        '0.0.0.0',          // All interfaces (sometimes used in Docker)
        'host.docker.internal', // Docker for Mac/Windows
        '172.17.0.1',       // Docker bridge
        '192.168.65.1',     // Docker Desktop
      ];

      // Add priority IPs that aren't already included
      for (const ip of priorityIPs) {
        if (!allCandidateIPs.includes(ip) && !networks.includes(ip)) {
          allCandidateIPs.unshift(ip); // Add to front for priority
        }
      }

      // Remove duplicates and invalid IPs, but keep priority ones
      const uniqueIPs = [...new Set(allCandidateIPs)].filter(ip =>
        !ip.endsWith('.0') && !ip.endsWith('.255') && ip !== '0.0.0.0'
      );

      // If WebRTC failed, log a helpful message
      if (!webRTCSuccess && uniqueIPs.length > 0) {
        console.log('ℹ️ WebRTC IP detection limited, using fallback network scanning');
        console.log('💡 For best results, ensure Ollama is accessible on your local network');
      }

      console.log(`🌐 Comprehensive network scan: Found ${uniqueIPs.length} potential IPs across ${commonSubnets.length} subnets`);
      return uniqueIPs.length > 0 ? uniqueIPs : ['127.0.0.1'];

    } catch (error) {
      console.warn('Failed to get comprehensive network info:', error);
      // Ultimate fallback - try the most common locations
      return ['localhost', '127.0.0.1', '192.168.1.100', '192.168.0.100'];
    }
  }

  /**
   * Generate adjacent subnets for more comprehensive scanning
   */
  private generateAdjacentSubnets(subnet: string): string[] {
    try {
      const [base, mask] = subnet.split('/');
      if (mask !== '24' || !base) return [];

      const parts = base.split('.').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return [];

      const a = parts[0]!;
      const b = parts[1]!;
      const c = parts[2]!;
      const adjacent: string[] = [];

      // Generate adjacent subnets (e.g., if we have 192.168.1.0/24, also try 192.168.0.0/24 and 192.168.2.0/24)
      if (c > 0) adjacent.push(`${a}.${b}.${c - 1}.0/24`);
      if (c < 255) adjacent.push(`${a}.${b}.${c + 1}.0/24`);

      return adjacent;
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if local network access appears to be restricted
   */
  private async checkLocalNetworkAccess(): Promise<{ restricted: boolean; reason?: string }> {
    try {
      // Try to access a common local IP that should fail if network access is restricted
      const testController = new AbortController();
      const timeoutId = setTimeout(() => testController.abort(), 1000);

      try {
        await fetch('http://192.168.1.1:80/test', {
          method: 'HEAD',
          signal: testController.signal,
          mode: 'no-cors' // Avoid CORS issues for this test
        });
        clearTimeout(timeoutId);
        return { restricted: false };
      } catch (error) {
        clearTimeout(timeoutId);

        // If we get a network error, local access might be restricted
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          return {
            restricted: true,
            reason: 'Browser local network access appears restricted. Try enabling local network access or add Ollama endpoint manually.'
          };
        }

        // Other errors might be expected (like connection refused)
        return { restricted: false };
      }
    } catch (error) {
      return { restricted: false };
    }
  }

  /**
   * Perform a quick scan of the most likely Ollama locations
   */
  private async performQuickScan(): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    const priorityLocations = [
      // Most likely locations first
      { host: 'localhost', port: 11434, priority: 1, label: 'Localhost (Primary)' },
      { host: '127.0.0.1', port: 11434, priority: 2, label: 'Localhost IPv4' },
      { host: '0.0.0.0', port: 11434, priority: 3, label: 'All Interfaces' },
      { host: 'host.docker.internal', port: 11434, priority: 4, label: 'Docker Host' },

      // Common local network locations
      { host: '192.168.1.100', port: 11434, priority: 10, label: 'Common LAN IP' },
      { host: '192.168.0.100', port: 11434, priority: 11, label: 'Alt LAN IP' },
      { host: '10.0.0.100', port: 11434, priority: 12, label: 'Private Network' },

      // Alternative ports on localhost
      { host: 'localhost', port: 8080, priority: 20, label: 'Localhost Alt Port' },
      { host: 'localhost', port: 3000, priority: 21, label: 'Localhost Dev Port' },
      { host: 'localhost', port: 5000, priority: 22, label: 'Localhost API Port' },
    ];

    for (const location of priorityLocations) {
      candidates.push({
        host: location.host,
        port: location.port,
        protocol: 'http',
        priority: location.priority,
        label: location.label,
      });
    }

    console.log(`⚡ Quick Scan: Testing ${candidates.length} priority locations first`);
    return candidates;
  }

  /**
   * Generate subnet notation from an IP address
   */
  private generateSubnetFromIP(ip: string): string | null {
    try {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
    } catch (error) {
      console.warn('Failed to generate subnet from IP:', ip, error);
    }
    return null;
  }

  /**
   * Generate IP addresses from subnet notation
   */
  private generateIPsFromSubnet(subnet: string): string[] {
    try {
      const [base, mask] = subnet.split('/');
      if (!base) return [];

      const [a, b, c] = base.split('.').map(Number);

      if (mask === '24') {
        const ips: string[] = [];
        // Generate IPs in the subnet (skip .0 and .255)
        for (let i = 1; i < 255; i++) {
          ips.push(`${a}.${b}.${c}.${i}`);
        }
        return ips;
      }
    } catch (error) {
      console.warn('Failed to generate IPs from subnet:', subnet, error);
    }
    return [];
  }

  /**
   * Generate network ranges to scan based on local IPs
   */
  private generateNetworkRanges(localIPs: string[]): Array<{ prefix: string; start: number; end: number }> {
    const ranges: Array<{ prefix: string; start: number; end: number }> = [];

    for (const ip of localIPs) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;

        // For home networks, scan common ranges
        // 192.168.x.x networks: scan 1-254
        // 10.x.x.x networks: scan 1-254
        // 172.16-31.x.x networks: scan 1-254
        if (parts[0] === '192' && parts[1] === '168') {
          ranges.push({ prefix, start: 1, end: 254 });
        } else if (parts[0] === '10') {
          ranges.push({ prefix, start: 1, end: 254 });
        } else if (parts[0] === '172' && parts[1] && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) {
          ranges.push({ prefix, start: 1, end: 254 });
        } else {
          // For other networks, scan a smaller range around the current IP
          const currentOctet = parts[3] ? parseInt(parts[3]) : 100;
          const start = Math.max(1, currentOctet - 10);
          const end = Math.min(254, currentOctet + 10);
          ranges.push({ prefix, start, end });
        }
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return ranges.filter(range => {
      const key = `${range.prefix}.${range.start}-${range.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Perform port scanning on discovered hosts
   */
  private async performPortScan(hosts: string[]): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    // Remove port 3000 as it's not relevant for Ollama (which uses 11434)
    const commonPorts = [11434, 11435, 8080, 5000, 8000, 9000];

    console.log(`🔍 Port Scan: Scanning ${hosts.length} hosts with ${commonPorts.length} ports each`);

    for (const host of hosts) {
      for (const port of commonPorts) {
        candidates.push({
          host,
          port,
          protocol: 'http',
          priority: 200 + port, // Higher priority than LAN scan
          label: `Port Scan: ${host}:${port}`,
        });
      }
    }

    return candidates;
  }
  private async performWiFiScan(): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    // Remove port 3000 as it's not relevant for Ollama
    const commonPorts = [11434, 11435, 8080, 5000];

    console.log(`📶 WiFi Scan: Performing smart scan of current network for Ollama endpoints`);

    try {
      // Get current network information
      const localIPs = await this.getLocalNetworkIPs();
      const networkRanges = this.generateNetworkRanges(localIPs);

      // For WiFi/mobile hotspot networks, scan more aggressively around the current IP
      for (const networkRange of networkRanges) {
        // Scan a wider range for WiFi networks (more devices likely)
        const start = Math.max(1, networkRange.start - 20);
        const end = Math.min(254, networkRange.end + 20);

        for (let i = start; i <= end; i++) {
          const ip = `${networkRange.prefix}.${i}`;
          for (const port of commonPorts) {
            candidates.push({
              host: ip,
              port,
              protocol: 'http',
              priority: 150 + (Math.abs(i - (networkRange.start + networkRange.end) / 2) * 5) + port, // Closer IPs get higher priority
              label: `WiFi Network: ${ip}:${port}`,
            });
          }
        }
      }

      // Also include common router/gateway IPs that might be running Ollama
      const gatewayIPs = [
        '192.168.0.1', '192.168.1.1', '192.168.1.254', '192.168.0.254',
        '10.0.0.1', '10.0.0.138', // Common for mobile hotspots
      ];

      for (const ip of gatewayIPs) {
        for (const port of commonPorts) {
          candidates.push({
            host: ip,
            port,
            protocol: 'http',
            priority: 140 + port, // Slightly lower priority than network scan
            label: `Gateway: ${ip}:${port}`,
          });
        }
      }

      console.log(`📶 WiFi Scan: Generated ${candidates.length} smart network scan candidates`);
    } catch (error) {
      console.warn('WiFi scan failed:', error);
    }

    return candidates;
  }

  /**
   * Generate candidate endpoints for auto-discovery
   */
  private async generateCandidateEndpoints(): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    let priority = 0;

    // 1. Cached successful endpoint (highest priority)
    if (this.cachedEndpoint) {
      candidates.push({ ...this.cachedEndpoint, priority: priority++ });
    }

    // 2. User-configured endpoints
    this.config.endpoints.forEach(endpoint => {
      candidates.push({ ...endpoint, priority: priority++ });
    });

    // 3. Current hostname (smart detection for LAN access)
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        candidates.push({
          host: currentHost,
          port: 11434,
          protocol: 'http',
          priority: priority++,
          label: 'Current Host',
        });
      }
    }

    // 4. Standard localhost
    candidates.push({
      host: 'localhost',
      port: 11434,
      protocol: 'http',
      priority: priority++,
      label: 'Localhost Default',
    });

    candidates.push({
      host: '127.0.0.1',
      port: 11434,
      protocol: 'http',
      priority: priority++,
      label: 'Localhost IP',
    });

    // 5. Comprehensive LAN scanning (if enabled)
    if (this.config.networkDetection.enableLANScan) {
      try {
        const lanCandidates = await this.performLANScan();
        candidates.push(...lanCandidates);
      } catch (error) {
        console.warn('LAN scan failed:', error);
      }
    }

    // 6. WiFi network scanning (if enabled)
    if (this.config.networkDetection.enableWiFiScan) {
      try {
        const wifiCandidates = await this.performWiFiScan();
        candidates.push(...wifiCandidates);
      } catch (error) {
        console.warn('WiFi scan failed:', error);
      }
    }

    // 7. Port scanning on discovered hosts (if enabled)
    if (this.config.networkDetection.enablePortScan) {
      try {
        const discoveredHosts = candidates.map(c => c.host);
        const uniqueHosts = [...new Set(discoveredHosts)];
        const portCandidates = await this.performPortScan(uniqueHosts);
        candidates.push(...portCandidates);
      } catch (error) {
        console.warn('Port scan failed:', error);
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return candidates.filter(endpoint => {
      const key = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Discover available Ollama endpoint (Spring Boot-style auto-configuration)
   * Performance: Debounced to prevent rapid re-discovery within 5 seconds
   */
  async discoverEndpoint(): Promise<OllamaDiscoveryResult | null> {
    // Check if already discovering
    if (this.isDiscovering) {
      console.log('[Ollama Discovery] Discovery already in progress');
      return null;
    }

    // Performance optimization: Debounce rapid discovery calls
    const now = Date.now();
    if (this.lastDiscoveryTime > 0 && now - this.lastDiscoveryTime < 5000) {
      console.log('[Ollama Discovery] Using recent discovery result (debounced)');
      // Return cached endpoint if available
      if (this.cachedEndpoint) {
        const cachedResult = await this.testEndpoint(this.cachedEndpoint);
        if (cachedResult.isHealthy) {
          return cachedResult;
        }
      }
      return null;
    }
    this.lastDiscoveryTime = now;

    if (!this.config.autoDiscovery && this.config.endpoints.length === 0) {
      return null;
    }

    // Set discovery state
    this.isDiscovering = true;
    this.abortController = new AbortController();
    this.emitDiscoveryEvent('discovery-start');

    try {
      // Step 1: Check for local network access restrictions
      const networkAccess = await this.checkLocalNetworkAccess();
      if (networkAccess.restricted) {
        console.warn('🚫 Local network access appears restricted:', networkAccess.reason);
        this.emitDiscoveryEvent('discovery-warning', { message: networkAccess.reason });
      }

      // Step 2: Quick scan of most likely locations first (OOTB optimization)
      console.log('⚡ Starting quick scan of priority locations...');
      const quickCandidates = await this.performQuickScan();
      const quickResult = await this.findFirstHealthyEndpoint(quickCandidates);

      if (quickResult && quickResult.isHealthy) {
        console.log('✅ Found Ollama via quick scan - skipping comprehensive scan');
        return quickResult;
      }

      // Step 3: Comprehensive scan if quick scan failed
      console.log('🔍 Quick scan failed, starting comprehensive discovery...');
      const candidates = await this.generateCandidateEndpoints();
      console.log(`🔍 Ollama Discovery: Testing ${candidates.length} candidate endpoints`);

      // Sort by priority
      candidates.sort((a, b) => a.priority - b.priority);

      // Test endpoints based on fallback behavior
      if (this.config.fallbackBehavior === 'fastest') {
        // Race all candidates to find fastest
        return this.findFastestEndpoint(candidates);
      } else {
        // Test in priority order until first healthy
        return this.findFirstHealthyEndpoint(candidates);
      }
    } finally {
      this.isDiscovering = false;
      this.abortController = null;
      this.emitDiscoveryEvent('discovery-end');
    }
  }

  /**
   * Find the fastest responding healthy endpoint
   */
  private async findFastestEndpoint(candidates: OllamaEndpoint[]): Promise<OllamaDiscoveryResult | null> {
    const maxConcurrent = this.config.networkDetection.maxConcurrentScans;
    const results: Array<PromiseSettledResult<OllamaDiscoveryResult>> = [];
    
    // Process candidates in batches to limit concurrent requests
    for (let i = 0; i < candidates.length; i += maxConcurrent) {
      const batch = candidates.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(endpoint => 
        this.testEndpoint(endpoint, this.abortController?.signal)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Check if cancelled
      if (this.abortController?.signal.aborted) {
        console.log('🛑 Fastest endpoint discovery cancelled');
        return null;
      }
    }

    const healthyResults = results
      .filter((result): result is PromiseFulfilledResult<OllamaDiscoveryResult> => 
        result.status === 'fulfilled' && result.value.isHealthy && !result.value.cancelled
      )
      .map(result => result.value)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (healthyResults.length > 0) {
      const fastest = healthyResults[0];
      if (fastest) {
        this.cacheSuccessfulEndpoint(fastest.endpoint);
        this.discoveryResults.set(this.getEndpointUrl(fastest.endpoint), fastest);
        console.log(`✅ Fastest Ollama endpoint: ${this.getEndpointUrl(fastest.endpoint)} (${fastest.responseTime}ms)`);
        this.emitDiscoveryEvent('discovery-success', fastest);
        return fastest;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
    this.emitDiscoveryEvent('discovery-failed');
    return null;
  }

  /**
   * Find the first healthy endpoint in priority order
   */
  private async findFirstHealthyEndpoint(candidates: OllamaEndpoint[]): Promise<OllamaDiscoveryResult | null> {
    for (const endpoint of candidates) {
      // Check if cancelled before testing each endpoint
      if (this.abortController?.signal.aborted) {
        console.log('🛑 First healthy endpoint discovery cancelled');
        return null;
      }
      
      const result = await this.testEndpoint(endpoint, this.abortController?.signal);
      this.discoveryResults.set(this.getEndpointUrl(endpoint), result);

      if (result.cancelled) {
        continue; // Skip cancelled results
      }

      if (result.isHealthy) {
        this.cacheSuccessfulEndpoint(endpoint);
        console.log(`✅ Found healthy Ollama endpoint: ${this.getEndpointUrl(endpoint)} (${result.responseTime}ms)`);
        this.emitDiscoveryEvent('discovery-success', result);
        return result;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
    this.emitDiscoveryEvent('discovery-failed');
    return null;
  }

  /**
   * Cache successful endpoint for faster future lookups
   */
  private cacheSuccessfulEndpoint(endpoint: OllamaEndpoint): void {
    if (this.config.cacheSuccessfulEndpoint) {
      this.cachedEndpoint = endpoint;
      try {
        localStorage.setItem('ollama-cached-endpoint', JSON.stringify(endpoint));
      } catch (error) {
        console.warn('Failed to cache endpoint:', error);
      }
    }
  }

  /**
   * Check if discovery is currently running
   */
  isDiscoveryRunning(): boolean {
    return this.isDiscovering;
  }

  /**
   * Cancel any ongoing discovery
   */
  cancelDiscovery(): void {
    if (this.abortController) {
      console.log('🛑 Cancelling Ollama discovery...');
      this.abortController.abort();
      this.abortController = null;
      this.isDiscovering = false;
      this.emitDiscoveryEvent('discovery-cancelled');
    }
  }

  /**
   * Retry with exponential backoff
   */
  async testWithRetry(endpoint: OllamaEndpoint): Promise<OllamaDiscoveryResult> {
    const { maxRetries, retryDelay, exponentialBackoff } = this.config.retryPolicy;
    let lastResult: OllamaDiscoveryResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.testEndpoint(endpoint);
      
      if (lastResult.isHealthy) {
        return lastResult;
      }

      if (attempt < maxRetries) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastResult!;
  }

  /**
   * Reset discovery state
   */
  reset(): void {
    this.cachedEndpoint = null;
    this.discoveryResults.clear();
    try {
      localStorage.removeItem('ollama-cached-endpoint');
    } catch (error) {
      console.warn('Failed to clear cached endpoint:', error);
    }
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.saveConfiguration(config);
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Get all discovery results
   */
  getDiscoveryResults(): Map<string, OllamaDiscoveryResult> {
    return new Map(this.discoveryResults);
  }

  /**
   * Emit discovery events for UI feedback
   */
  private emitDiscoveryEvent(eventType: string, data?: any) {
    window.dispatchEvent(new CustomEvent(`ollama-${eventType}`, { detail: data }));
  }
}

// Singleton instance
export const ollamaDiscovery = new OllamaDiscoveryService();

// Helper function to get the best Ollama endpoint
export async function getOllamaEndpoint(): Promise<string | null> {
  const result = await ollamaDiscovery.discoverEndpoint();
  if (result && result.isHealthy) {
    return `${result.endpoint.protocol}://${result.endpoint.host}:${result.endpoint.port}`;
  }
  return null;
}
