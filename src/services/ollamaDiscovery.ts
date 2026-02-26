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
    // Safety caps and flags
    maxCandidates?: number;
    enableFullLANScan?: boolean;
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
    // 100ms chosen as a balance: much faster responsiveness while tolerating typical LAN jitter.
    // Advanced users can lower this in Admin > Ollama if their environment is very responsive.
    scanTimeout: 100,
    // Maximum number of generated candidate endpoints to test (safety cap).
    maxCandidates: 500,
    // When false, LAN scans will use a focused window around the current IP instead of full /24.
    enableFullLANScan: false,
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

    // For Ollama, basePath should typically be empty so /api/ can be appended per endpoint
    // Only keep basePath if explicitly provided and not the default /api
    if (normalized.basePath && normalized.basePath !== '/api') {
      if (!normalized.basePath.startsWith('/')) {
        normalized.basePath = '/' + normalized.basePath;
      }
    } else {
      normalized.basePath = ''; // Empty basePath is correct for standard Ollama
    }

    // Validate protocol
    if (!['http', 'https'].includes(normalized.protocol)) {
      normalized.protocol = 'http';
    }

    // Generate a default label if not provided
    if (!normalized.label) {
      normalized.label = `${normalized.protocol}://${normalized.host}:${normalized.port}`;
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
    // Ensure no trailing slash on basePath to avoid duplicate api segments
    const cleanedBase = (basePath || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${protocol}://${host}:${port}${cleanedBase}`;
  }

  /**
   * Test if an endpoint is healthy
   *
   * Accepts an optional external AbortSignal so callers can abort this test
   * when another worker finds a healthy endpoint.
   */
  private async testEndpoint(endpoint: OllamaEndpoint, externalSignal?: AbortSignal, timeoutOverride?: number): Promise<OllamaDiscoveryResult> {
    const startTime = Date.now();
    const url = this.getEndpointUrl(endpoint);
    // timeoutOverride lets callers specify a longer timeout for health checks vs. rapid LAN scanning
    const timeout = timeoutOverride !== undefined ? timeoutOverride : (endpoint.timeout || this.config.networkDetection.scanTimeout);

    let onExternalAbort: (() => void) | null = null;
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // If an external signal is provided, forward its abort to our controller
      onExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort();
        } else {
          externalSignal.addEventListener('abort', onExternalAbort);
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (endpoint.apiKey) {
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
      }

      // Try to get Ollama version info
      // Normalize URL to avoid duplicate '/api' segments (some configs include '/api')
      const cleanUrl = url.replace(/\/api\/?$/, '');
      const response = await fetch(`${cleanUrl}/api/version`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (externalSignal && onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
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
      if (externalSignal && onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
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

      // Scan network ranges (focused window unless full scan explicitly enabled)
      for (const networkRange of networkRanges) {
        for (const port of commonPorts) {
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
          }

          candidates.push(...rangeCandidates);
        }
      }

      // Safety: cap number of candidates to avoid storms
      const maxCandidates = this.config.networkDetection.maxCandidates || 500;
      if (candidates.length > maxCandidates) {
        console.warn(`LAN scan generated ${candidates.length} candidates, truncating to ${maxCandidates}`);
        candidates.length = maxCandidates;
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

        // For home networks, use a focused window by default to avoid creating full /24 scans.
        // If the user explicitly enables full LAN scan (enableFullLANScan), a broader range will be used.
        const currentOctet = parts[3] ? parseInt(parts[3]) : 100;
        const window = this.config.networkDetection.enableFullLANScan ? 254 : 20;
        const start = Math.max(1, currentOctet - window);
        const end = Math.min(254, currentOctet + window);
        ranges.push({ prefix, start, end });
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
   * Check if app is deployed (vs running locally)
   * Returns true if running on a deployed domain (GitHub Pages, Vercel, etc.)
   */
  isAppDeployed(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return !['localhost', '127.0.0.1', 'l.ocalhost'].some(h => hostname.includes(h));
  }

  /**
   * Check if app is running over HTTPS (blocks mixed content to HTTP)
   */
  isAppHTTPS(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.protocol === 'https:';
  }

  /**
   * Get mDNS hostname candidates (Bonjour service discovery)
   */
  private getMDNSCandidates(priority: number): { candidates: OllamaEndpoint[]; nextPriority: number } {
    const candidates: OllamaEndpoint[] = [];
    let p = priority;
    
    // Common mDNS hostnames for Ollama
    const mdnsNames = [
      'ollama',           // Direct name
      'ollama.local',     // Standard mDNS
      'localhost-ollama', // Some setups use this
      'ollama-server',    // Alternative naming
      'local.ollama',     // Reverse variation
    ];

    const ports = [11434, 11435, 8080];

    for (const name of mdnsNames) {
      for (const port of ports) {
        candidates.push({
          host: name,
          port,
          protocol: 'http',
          priority: p++,
          label: `mDNS: ${name}:${port}`,
        });
      }
    }

    return { candidates, nextPriority: p };
  }

  /**
   * Generate candidate endpoints for auto-discovery
   */
  private async generateCandidateEndpoints(): Promise<OllamaEndpoint[]> {
    const candidates: OllamaEndpoint[] = [];
    let priority = 0;
    const isDeployed = this.isAppDeployed();
    const isHTTPS = this.isAppHTTPS();

    // 1. Cached successful endpoint (highest priority)
    if (this.cachedEndpoint) {
      candidates.push({ ...this.cachedEndpoint, priority: priority++ });
    }

    // 2. User-configured endpoints
    this.config.endpoints.forEach(endpoint => {
      candidates.push({ ...endpoint, priority: priority++ });
    });

    // 3. For deployed HTTPS apps: Try mDNS first (before localhost, which will fail)
    if (isDeployed && isHTTPS) {
      const { candidates: mdnsCandidates, nextPriority } = this.getMDNSCandidates(priority);
      candidates.push(...mdnsCandidates);
      priority = nextPriority;
    }

    // 4. Current hostname (smart detection for LAN access)
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

    // 5. Standard localhost
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

    // 6. For local apps: Try mDNS after localhost
    if (!isDeployed || !isHTTPS) {
      const { candidates: mdnsCandidates, nextPriority } = this.getMDNSCandidates(priority);
      candidates.push(...mdnsCandidates);
      priority = nextPriority;
    }

    // 7. Comprehensive LAN scanning (if enabled AND not HTTPS deployed, due to mixed content)
    if (this.config.networkDetection.enableLANScan && (!isDeployed || !isHTTPS)) {
      try {
        const lanCandidates = await this.performLANScan();
        candidates.push(...lanCandidates);
      } catch (error) {
        console.warn('LAN scan failed:', error);
      }
    }

    // 8. WiFi network scanning (if enabled AND not HTTPS deployed)
    if (this.config.networkDetection.enableWiFiScan && (!isDeployed || !isHTTPS)) {
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
    // Run tests in parallel with limited concurrency and abort remaining tests once a healthy
    // endpoint is found. This avoids waiting serially for many timeouts on large subnets.
    // Conservative concurrency cap to avoid request storms. Scale with candidate count but keep low.
    const configuredMax = 10; // safe default max concurrent requests
    const concurrency = Math.min(configuredMax, Math.max(4, Math.floor(candidates.length / 40) || 4));

    let found: OllamaDiscoveryResult | null = null;
    const controllers: AbortController[] = [];

    // Worker pool
    let idx = 0;
    const workers: Promise<void>[] = [];

    const pickNext = () => {
      const i = idx;
      idx += 1;
      return i;
    };

    const worker = async () => {
      while (true) {
        if (found) return;
        const i = pickNext();
        if (i >= candidates.length) return;

        const endpoint = candidates[i]!;
        const controller = new AbortController();
        controllers.push(controller);

        try {
          const result = await this.testEndpoint(endpoint, controller.signal);
          // store the result for UI/debug
          this.discoveryResults.set(this.getEndpointUrl(endpoint), result);

          if (result.isHealthy) {
            found = result;
            // cache and abort remaining
            this.cacheSuccessfulEndpoint(endpoint);
            console.log(`✅ Found healthy Ollama endpoint: ${this.getEndpointUrl(endpoint)} (${result.responseTime}ms)`);
            controllers.forEach(c => c.abort());
            return;
          }
        } catch (err) {
          // ignore individual worker errors
        }
      }
    };

    for (let w = 0; w < concurrency; w++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    if (!found) {
      console.warn('❌ No healthy Ollama endpoints found');
    }
    return found;
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
   * Quick Check — test ONLY configured + cached + localhost endpoints.
   * No LAN/WiFi/port scanning.  Designed to be called frequently (polling, ConnectionStatus).
   * Returns the first healthy endpoint found, or null.
   */
  async quickCheck(): Promise<OllamaDiscoveryResult | null> {
    const candidates: OllamaEndpoint[] = [];
    let priority = 0;

    // 1. Cached endpoint
    if (this.cachedEndpoint) {
      candidates.push({ ...this.cachedEndpoint, priority: priority++ });
    }

    // 2. User-configured endpoints
    for (const ep of this.config.endpoints) {
      candidates.push({ ...ep, priority: priority++ });
    }

    // 3. Current hostname (LAN access)
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        candidates.push({ host: currentHost, port: 11434, protocol: 'http', priority: priority++, label: 'Current Host' });
      }
    }

    // 4. Localhost fallbacks
    candidates.push({ host: 'localhost', port: 11434, protocol: 'http', priority: priority++, label: 'Localhost' });
    candidates.push({ host: '127.0.0.1', port: 11434, protocol: 'http', priority: priority++, label: 'Localhost IP' });

    // De-duplicate
    const seen = new Set<string>();
    const unique = candidates.filter(ep => {
      const key = `${ep.protocol}://${ep.host}:${ep.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Test in priority order (parallel, first-healthy wins)
    return this.findFirstHealthyEndpoint(unique);
  }

  /**
   * Fetch models from a specific endpoint URL (base URL without /api path).
   * Returns { name, size }[].
   */
  async fetchModelsFromEndpoint(baseUrl: string): Promise<{ name: string; size?: number }[]> {
    try {
      const cleanBase = baseUrl.replace(/\/api\/?$/, '');
      const resp = await fetch(`${cleanBase}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.models || [])
        .filter((m: any) => !m.name?.toLowerCase().includes('embed'))
        .map((m: any) => ({ name: m.name, size: m.size }));
    } catch {
      return [];
    }
  }

  /**
   * Get all configured endpoints with their live health + models.
   * Used by OllamaConfigPanel to show a comprehensive view.
   */
  async getEndpointsWithModels(): Promise<Array<{
    endpoint: OllamaEndpoint;
    baseUrl: string;
    isHealthy: boolean;
    responseTime: number;
    version?: string;
    models: { name: string; size?: number }[];
    error?: string;
  }>> {
    // Track which endpoints are explicitly configured (user-added or cached).
    // Auto-discovered fallbacks (localhost etc.) are only shown when healthy,
    // to avoid cluttering the UI with "connection timeout" for unrelated hosts.
    const configuredKeys = new Set<string>();
    const candidates: OllamaEndpoint[] = [];
    let priority = 0;

    // 1. Cached endpoint (highest priority)
    if (this.cachedEndpoint) {
      const key = `${this.cachedEndpoint.protocol}://${this.cachedEndpoint.host}:${this.cachedEndpoint.port}`;
      configuredKeys.add(key);
      candidates.push({ ...this.cachedEndpoint, priority: priority++ });
    }

    // 2. User-configured endpoints
    for (const ep of this.config.endpoints) {
      const key = `${ep.protocol}://${ep.host}:${ep.port}`;
      configuredKeys.add(key);
      candidates.push({ ...ep, priority: priority++ });
    }

    // 3. Current hostname (auto-discovered, not explicitly configured)
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        candidates.push({ host: currentHost, port: 11434, protocol: 'http', priority: priority++, label: 'Current Host' });
      }
    }

    // 4. Localhost fallbacks (auto-discovered, not explicitly configured)
    candidates.push({ host: 'localhost', port: 11434, protocol: 'http', priority: priority++, label: 'Localhost' });
    candidates.push({ host: '127.0.0.1', port: 11434, protocol: 'http', priority: priority++, label: 'Localhost IP' });

    // De-duplicate
    const seen = new Set<string>();
    const unique = candidates.filter(ep => {
      const key = `${ep.protocol}://${ep.host}:${ep.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Use appropriate timeouts:
    // - Configured/cached endpoints: 3000ms (real health check, not a blind scan)
    // - Auto-discovered fallbacks (localhost etc.): 1500ms (shorter but still fair)
    // The scanTimeout (100ms) is only meant for rapid LAN discovery, not status checks.
    const CONFIGURED_TIMEOUT = 3000;
    const AUTO_TIMEOUT = 1500;

    const rawResults = await Promise.all(unique.map(async (ep) => {
      const baseUrl = `${ep.protocol}://${ep.host}:${ep.port}`;
      const isConfigured = configuredKeys.has(baseUrl);
      const timeout = isConfigured ? CONFIGURED_TIMEOUT : AUTO_TIMEOUT;
      const healthResult = await this.testEndpoint(ep, undefined, timeout);
      let models: { name: string; size?: number }[] = [];
      if (healthResult.isHealthy) {
        models = await this.fetchModelsFromEndpoint(baseUrl);
      }
      return {
        endpoint: ep,
        baseUrl,
        isHealthy: healthResult.isHealthy,
        responseTime: healthResult.responseTime,
        version: healthResult.version,
        models,
        error: healthResult.error,
        _isConfigured: isConfigured,
      };
    }));

    // Return:
    //   • All configured/cached endpoints (healthy or not — user needs to know their status)
    //   • Auto-discovered endpoints ONLY when healthy (avoids spurious "timeout" noise)
    return rawResults
      .filter(r => r._isConfigured || r.isHealthy)
      .map(({ _isConfigured, ...r }) => r);
  }

  /**
   * Get all user-configured endpoint URLs (for dropdowns).
   * Includes cached endpoint if different from configured.
   */
  getConfiguredEndpointUrls(): string[] {
    const urls: string[] = [];
    const seen = new Set<string>();

    // Cached endpoint first
    if (this.cachedEndpoint) {
      const url = `${this.cachedEndpoint.protocol}://${this.cachedEndpoint.host}:${this.cachedEndpoint.port}`;
      if (!seen.has(url)) { urls.push(url); seen.add(url); }
    }

    // User-configured endpoints
    for (const ep of this.config.endpoints) {
      const url = `${ep.protocol}://${ep.host}:${ep.port}`;
      if (!seen.has(url)) { urls.push(url); seen.add(url); }
    }

    // Localhost as fallback
    if (!seen.has('http://localhost:11434')) urls.push('http://localhost:11434');

    return urls;
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
