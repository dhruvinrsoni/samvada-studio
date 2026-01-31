// Health Monitoring Plugin System
// Extensible architecture for silent failure prevention
// Follows Open-Closed Principle: Open for extension, closed for modification

export interface HealthCheck {
  id: string;
  name: string;
  category: 'theme' | 'api' | 'performance' | 'accessibility' | 'custom';
  check: () => Promise<HealthResult> | HealthResult;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface HealthResult {
  isHealthy: boolean;
  issues: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface HealthReport {
  timestamp: Date;
  overallHealth: boolean;
  checks: Array<{
    checkId: string;
    result: HealthResult;
    duration: number;
  }>;
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    issues: number;
    byCategory: Record<string, number>;
  };
}

class HealthMonitor {
  private checks = new Map<string, HealthCheck>();
  private listeners = new Set<(report: HealthReport) => void>();

  // Register a health check plugin
  register(check: HealthCheck): void {
    this.checks.set(check.id, check);
  }

  // Unregister a health check
  unregister(checkId: string): void {
    this.checks.delete(checkId);
  }

  // Enable/disable a specific check
  setEnabled(checkId: string, enabled: boolean): void {
    const check = this.checks.get(checkId);
    if (check) {
      check.enabled = enabled;
    }
  }

  // Run all enabled health checks
  async runAllChecks(): Promise<HealthReport> {
    const results: HealthReport['checks'] = [];

    for (const [checkId, check] of this.checks) {
      if (!check.enabled) continue;

      const checkStart = performance.now();
      try {
        const result = await check.check();
        const duration = performance.now() - checkStart;

        results.push({
          checkId,
          result,
          duration
        });
      } catch (error) {
        results.push({
          checkId,
          result: {
            isHealthy: false,
            issues: [`Check failed: ${error instanceof Error ? error.message : String(error)}`]
          },
          duration: performance.now() - checkStart
        });
      }
    }

    const summary = this.generateSummary(results);

    const report: HealthReport = {
      timestamp: new Date(),
      overallHealth: summary.issues === 0,
      checks: results,
      summary
    };

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Health monitor listener error:', error);
      }
    });

    return report;
  }

  // Run a specific health check
  async runCheck(checkId: string): Promise<HealthResult | null> {
    const check = this.checks.get(checkId);
    if (!check || !check.enabled) return null;

    try {
      return await check.check();
    } catch (error) {
      return {
        isHealthy: false,
        issues: [`Check failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  // Subscribe to health reports
  subscribe(listener: (report: HealthReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get all registered checks
  getChecks(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  // Get checks by category
  getChecksByCategory(category: HealthCheck['category']): HealthCheck[] {
    return Array.from(this.checks.values()).filter(check => check.category === category);
  }

  private generateSummary(checks: HealthReport['checks']) {
    const summary = {
      total: checks.length,
      healthy: 0,
      warnings: 0,
      issues: 0,
      byCategory: {} as Record<string, number>
    };

    for (const check of checks) {
      const category = this.checks.get(check.checkId)?.category || 'unknown';

      if (!summary.byCategory[category]) {
        summary.byCategory[category] = 0;
      }
      summary.byCategory[category]++;

      if (check.result.isHealthy) {
        summary.healthy++;
      } else {
        summary.issues++;
      }

      if (check.result.warnings?.length) {
        summary.warnings += check.result.warnings.length;
      }
    }

    return summary;
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

// Built-in health check plugins
export const builtInChecks = {
  themeSystem: {
    id: 'theme-system',
    name: 'Theme System Health',
    category: 'theme' as const,
    priority: 'high' as const,
    enabled: true,
    check: async (): Promise<HealthResult> => {
      // Dynamic import to avoid circular dependencies
      const { validateCSS } = await import('./debug');

      const health = validateCSS.checkThemeHealth();
      return {
        isHealthy: health.isHealthy,
        issues: health.issues,
        metadata: {
          themeStatus: validateCSS.getThemeStatus()
        }
      };
    }
  },

  ollamaConnectivity: {
    id: 'ollama-connectivity',
    name: 'Ollama Connectivity',
    category: 'api' as const,
    priority: 'critical' as const,
    enabled: true,
    check: async (): Promise<HealthResult> => {
      try {
        const { ollamaDiscovery } = await import('../services/ollamaDiscovery.js');
        const result = await ollamaDiscovery.discoverEndpoint();
        
        if (result && result.isHealthy) {
          return {
            isHealthy: true,
            issues: [],
            warnings: [],
            metadata: {
              endpoint: `${result.endpoint.protocol}://${result.endpoint.host}:${result.endpoint.port}`,
              responseTime: `${result.responseTime}ms`,
              version: result.version,
              label: result.endpoint.label || 'Default',
            },
          };
        } else {
          const errorMsg = result?.error || 'No healthy endpoints found';
          return {
            isHealthy: false,
            issues: [
              'Ollama not accessible',
              errorMsg,
            ],
            warnings: [
              'Configure custom Ollama endpoint in Admin Panel > Ollama tab',
              'For mobile/LAN access, add your PC\'s IP address (e.g., 192.168.1.100:11434)',
            ],
          };
        }
      } catch (error: any) {
        return {
          isHealthy: false,
          issues: [`Ollama health check failed: ${error.message}`],
          warnings: ['Check Ollama configuration in Admin Panel'],
        };
      }
    }
  },

  performanceMetrics: {
    id: 'performance-metrics',
    name: 'Performance Metrics',
    category: 'performance' as const,
    priority: 'medium' as const,
    enabled: true,
    check: async (): Promise<HealthResult> => {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check memory usage
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedPercent = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100;

        if (usedPercent > 80) {
          issues.push(`High memory usage: ${usedPercent.toFixed(1)}%`);
        } else if (usedPercent > 60) {
          warnings.push(`Moderate memory usage: ${usedPercent.toFixed(1)}%`);
        }
      }

      // Check for long tasks
      if ('PerformanceObserver' in window) {
        // This would track long tasks in a real implementation
        warnings.push('Long task monitoring not implemented');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        warnings,
        metadata: {
          memory: (performance as any).memory
        }
      };
    }
  },

  accessibilityBasics: {
    id: 'accessibility-basics',
    name: 'Basic Accessibility',
    category: 'accessibility' as const,
    priority: 'medium' as const,
    enabled: true,
    check: async (): Promise<HealthResult> => {
      const issues: string[] = [];

      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt text`);
      }

      // Check for missing lang attribute
      if (!document.documentElement.lang) {
        issues.push('Missing lang attribute on html element');
      }

      // Check for focusable elements
      const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusableElements.length === 0) {
        issues.push('No focusable elements found');
      }

      return {
        isHealthy: issues.length === 0,
        issues
      };
    }
  }
};

// Auto-register built-in checks
Object.values(builtInChecks).forEach(check => {
  healthMonitor.register(check);
});