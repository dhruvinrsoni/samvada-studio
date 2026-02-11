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
    // Reduced default timeout for faster discovery while still allowing slow LAN replies.
    // 300ms is a good balance between speed and reliability on typical local networks.
    scanTimeout: 300,
  },
};

// Global discovery guard/timeout (ms) - ensures discoverEndpoint always resolves
const GLOBAL_DISCOVERY_TIMEOUT = 15000;

// Storage key for persisted configuration
const STORAGE_KEY = 'ollama-discovery-config';

class OllamaDiscoveryService {
  private config: OllamaConfiguration;
  private cachedEndpoint: OllamaEndpoint | null = null;
  private discoveryResults: Map<string, OllamaDiscoveryResult> = new Map();
  private lastDiscoveryTime = 0; // Timestamp for debouncing rapid calls
  private discoveryInProgress = false;

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
  private async testEndpoint(endpoint: OllamaEndpoint): Promise<OllamaDiscoveryResult> {
    const startTime = Date.now();
    const url = this.getEndpointUrl(endpoint);
    const timeout = endpoint.timeout || this.config.networkDetection.scanTimeout;

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

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

      // Scan network ranges
      for (const networkRange of networkRanges) {
        for (const port of commonPorts) {
          // Limit concurrent requests to avoid overwhelming the network
          const batchSize = 10;
          const rangeCandidates: OllamaEndpoint[] = [];

          for (let i = networkRange.start; i <= networkRange.end; i++) {
            const ip = `${networkRange.prefix}.${i}`;
            rangeCandidates.push({
              host: ip,
              port,
              protocol: 'http',
              priority: 100 + (i * 10) + port, // Lower priority for LAN scans
              label: `LAN: ${ip}:${port}`,
            });

            // Process in batches
            if (rangeCandidates.length >= batchSize) {
              candidates.push(...rangeCandidates);
              rangeCandidates.length = 0;
            }
          }

          // Add remaining candidates
          candidates.push(...rangeCandidates);
        }
      }

      console.log(`📡 Generated ${candidates.length} LAN scan candidates`);
    } catch (error) {
      console.warn('LAN scan failed:', error);
    }

    return candidates;
  }

  /**
   * Get local network IP addresses and information
   */
  private async getLocalNetworkIPs(): Promise<string[]> {
    const ips: string[] = [];

    try {
      // Try to get network information from WebRTC (works in browsers)
      if (typeof window !== 'undefined' && window.RTCPeerConnection) {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE candidates
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 1000);
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
              if (ipMatch && ipMatch[1]) {
                const ip = ipMatch[1];
                if (!ips.includes(ip) && !ip.startsWith('127.')) {
                  ips.push(ip);
                }
              }
            } else {
              clearTimeout(timeout);
              resolve();
            }
          };
        });

        pc.close();
      }

      // Fallback: use current hostname to infer network
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          ips.push(hostname);
        }
      }

      // Add localhost as fallback
      if (!ips.includes('127.0.0.1')) {
        ips.push('127.0.0.1');
      }

    } catch (error) {
      console.warn('Failed to get local IPs:', error);
      ips.push('127.0.0.1');
    }

    return ips;
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
    const commonPorts = [11434, 11435, 8080, 3000, 5000, 8000, 9000];

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
    const commonPorts = [11434, 11435, 8080, 3000, 5000];

    // Common WiFi network patterns and device IPs
    const wifiPatterns = [
      // Router gateway IPs (common defaults)
      '192.168.0.1', '192.168.1.1', '192.168.1.254', '192.168.0.254',
      '10.0.0.1', '10.0.0.138', // Common for mobile hotspots
      // Common device IPs in WiFi networks
      '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103', '192.168.1.104', '192.168.1.105',
      '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.103', '192.168.0.104', '192.168.0.105',
    ];

    console.log(`📶 WiFi Scan: Scanning ${wifiPatterns.length} common WiFi IPs with ${commonPorts.length} ports each`);

    for (const ip of wifiPatterns) {
      for (const port of commonPorts) {
        candidates.push({
          host: ip,
          port,
          protocol: 'http',
          priority: 150 + (wifiPatterns.indexOf(ip) * 10) + port, // Medium priority
          label: `WiFi: ${ip}:${port}`,
        });
      }
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
    // Performance optimization: Debounce rapid discovery calls
    const now = Date.now();
    if (this.lastDiscoveryTime > 0 && now - this.lastDiscoveryTime < 5000) {
      console.log('[Ollama Discovery] Using recent discovery result (debounced)');
      // Return cached endpoint if available - but guard the cached check with a short timeout
      if (this.cachedEndpoint) {
        try {
          const cachedResult = await Promise.race([
            this.testEndpoint(this.cachedEndpoint),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 2000)),
          ]);
          if (cachedResult && (cachedResult as OllamaDiscoveryResult).isHealthy) {
            return cachedResult as OllamaDiscoveryResult;
          }
        } catch (e) {
          console.warn('Cached endpoint test failed during debounce check', e);
        }
      }
      return null;
    }

    // Prevent concurrent discovery runs
    if (this.discoveryInProgress) {
      console.log('[Ollama Discovery] Discovery already in progress, skipping');
      return null;
    }

    this.discoveryInProgress = true;
    this.lastDiscoveryTime = now;

    // If autoDiscovery is disabled and there are no endpoints, nothing to do
    if (!this.config.autoDiscovery && this.config.endpoints.length === 0) {
      this.discoveryInProgress = false;
      return null;
    }

    // Wrap the main discovery flow so we can enforce a global timeout
    const discoveryFlow = async (): Promise<OllamaDiscoveryResult | null> => {
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
    };

    try {
      const result = await Promise.race([
        discoveryFlow(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), GLOBAL_DISCOVERY_TIMEOUT)),
      ]);
      return result as OllamaDiscoveryResult | null;
    } finally {
      this.discoveryInProgress = false;
    }
  }

  /**
   * Find the fastest responding healthy endpoint
   */
  private async findFastestEndpoint(
    candidates: OllamaEndpoint[]
  ): Promise<OllamaDiscoveryResult | null> {
    const results = await Promise.allSettled(
      candidates.map(endpoint => this.testEndpoint(endpoint))
    );

    const healthyResults = results
      .filter((result): result is PromiseFulfilledResult<OllamaDiscoveryResult> => 
        result.status === 'fulfilled' && result.value.isHealthy
      )
      .map(result => result.value)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (healthyResults.length > 0) {
      const fastest = healthyResults[0];
      if (fastest) {
        this.cacheSuccessfulEndpoint(fastest.endpoint);
        this.discoveryResults.set(this.getEndpointUrl(fastest.endpoint), fastest);
        console.log(`✅ Fastest Ollama endpoint: ${this.getEndpointUrl(fastest.endpoint)} (${fastest.responseTime}ms)`);
        return fastest;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
    return null;
  }

  /**
   * Find the first healthy endpoint in priority order
   */
  private async findFirstHealthyEndpoint(
    candidates: OllamaEndpoint[]
  ): Promise<OllamaDiscoveryResult | null> {
    for (const endpoint of candidates) {
      const result = await this.testEndpoint(endpoint);
      this.discoveryResults.set(this.getEndpointUrl(endpoint), result);

      if (result.isHealthy) {
        this.cacheSuccessfulEndpoint(endpoint);
        console.log(`✅ Found healthy Ollama endpoint: ${this.getEndpointUrl(endpoint)} (${result.responseTime}ms)`);
        return result;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
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
   * Get all discovery results
   */
  getDiscoveryResults(): Map<string, OllamaDiscoveryResult> {
    return new Map(this.discoveryResults);
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
