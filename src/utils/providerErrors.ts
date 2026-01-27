/**
 * Provider Error Handling Framework
 * 
 * Universal error classification and handling system for all LLM providers
 * Designed to be extensible and future-proof
 * 
 * Features:
 * - Provider-specific error parsing
 * - Categorized error types
 * - User-friendly messages with actionable advice
 * - Automatic error detection and classification
 */

import type { LLMProviderType } from '../types';

/**
 * Standard error categories across all providers
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',      // Invalid/expired/revoked API keys
  BILLING = 'billing',                   // Insufficient credits, quota exceeded, payment required
  RATE_LIMIT = 'rate_limit',            // Too many requests, throttled
  SERVICE_UNAVAILABLE = 'service',       // Service down, maintenance, outage
  NETWORK = 'network',                   // Timeout, connection refused, DNS issues
  INVALID_REQUEST = 'invalid_request',   // Bad parameters, unsupported model, malformed request
  RESOURCE_NOT_FOUND = 'not_found',      // Model not found, endpoint not found
  INSUFFICIENT_RESOURCES = 'resources',  // Out of memory, disk space, etc.
  UNKNOWN = 'unknown',                   // Uncategorized errors
}

/**
 * Standardized error information
 */
export interface ProviderError {
  category: ErrorCategory;
  title: string;
  message: string;
  userAction?: string;
  documentationUrl?: string;
  retryable: boolean;
  technicalDetails?: string;
}

/**
 * Provider-specific error response structures
 */
interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

interface GoogleErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Base error classifier
 */
abstract class ProviderErrorClassifier {
  abstract parseError(response: any, statusCode?: number): ProviderError;
  
  /**
   * Common network error detection
   */
  protected isNetworkError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('failed to fetch') ||
        message.includes('network error') ||
        message.includes('connection refused') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        error.name === 'AbortError'
      );
    }
    return false;
  }

  /**
   * Create a standardized error object
   */
  protected createError(
    category: ErrorCategory,
    title: string,
    message: string,
    userAction?: string,
    documentationUrl?: string,
    retryable: boolean = false,
    technicalDetails?: string
  ): ProviderError {
    return {
      category,
      title,
      message,
      userAction,
      documentationUrl,
      retryable,
      technicalDetails,
    };
  }
}

/**
 * Anthropic/Claude error classifier
 */
class AnthropicErrorClassifier extends ProviderErrorClassifier {
  parseError(response: any, statusCode?: number): ProviderError {
    // Handle network errors
    if (this.isNetworkError(response)) {
      return this.createError(
        ErrorCategory.NETWORK,
        'Connection Failed',
        'Unable to reach Anthropic API',
        'Check your internet connection and try again',
        'https://docs.anthropic.com/en/api/errors',
        true
      );
    }

    // Parse Anthropic-specific error format
    const anthropicError = response as AnthropicErrorResponse;
    const errorType = anthropicError?.error?.type;
    const errorMessage = anthropicError?.error?.message || '';

    // Authentication errors
    if (errorType === 'authentication_error' || statusCode === 401) {
      return this.createError(
        ErrorCategory.AUTHENTICATION,
        'Invalid API Key',
        'Your Anthropic API key is invalid or has been revoked',
        'Update your API key in Settings > Admin Panel',
        'https://console.anthropic.com/settings/keys',
        false,
        errorMessage
      );
    }

    // Billing/credit errors
    if (
      errorType === 'invalid_request_error' &&
      errorMessage.toLowerCase().includes('credit balance')
    ) {
      return this.createError(
        ErrorCategory.BILLING,
        'Insufficient Credits',
        'Your Anthropic account has insufficient credits',
        'Add credits or upgrade your plan at console.anthropic.com',
        'https://console.anthropic.com/settings/billing',
        false,
        errorMessage
      );
    }

    // Rate limit errors
    if (errorType === 'rate_limit_error' || statusCode === 429) {
      return this.createError(
        ErrorCategory.RATE_LIMIT,
        'Rate Limit Exceeded',
        'Too many requests to Anthropic API',
        'Wait a moment before retrying, or upgrade your plan for higher limits',
        'https://docs.anthropic.com/en/api/rate-limits',
        true,
        errorMessage
      );
    }

    // Quota exceeded
    if (errorMessage.toLowerCase().includes('quota')) {
      return this.createError(
        ErrorCategory.BILLING,
        'Quota Exceeded',
        'Your API usage quota has been exceeded',
        'Check your usage and billing at console.anthropic.com',
        'https://console.anthropic.com/settings/billing',
        false,
        errorMessage
      );
    }

    // Service errors
    if (statusCode && statusCode >= 500) {
      return this.createError(
        ErrorCategory.SERVICE_UNAVAILABLE,
        'Service Unavailable',
        'Anthropic API is temporarily unavailable',
        'Try again in a few moments',
        'https://status.anthropic.com',
        true,
        errorMessage
      );
    }

    // Invalid request
    if (errorType === 'invalid_request_error') {
      return this.createError(
        ErrorCategory.INVALID_REQUEST,
        'Invalid Request',
        errorMessage || 'The request was malformed or invalid',
        'Check your model settings and parameters',
        'https://docs.anthropic.com/en/api',
        false,
        errorMessage
      );
    }

    // Unknown error
    return this.createError(
      ErrorCategory.UNKNOWN,
      'Unknown Error',
      errorMessage || 'An unexpected error occurred',
      'Check the Anthropic status page or contact support',
      'https://status.anthropic.com',
      false,
      errorMessage
    );
  }
}

/**
 * OpenAI error classifier
 */
class OpenAIErrorClassifier extends ProviderErrorClassifier {
  parseError(response: any, statusCode?: number): ProviderError {
    if (this.isNetworkError(response)) {
      return this.createError(
        ErrorCategory.NETWORK,
        'Connection Failed',
        'Unable to reach OpenAI API',
        'Check your internet connection and try again',
        'https://status.openai.com',
        true
      );
    }

    const openaiError = response as OpenAIErrorResponse;
    const errorCode = openaiError?.error?.code;
    const errorType = openaiError?.error?.type;
    const errorMessage = openaiError?.error?.message || '';

    // Authentication errors
    if (statusCode === 401 || errorType === 'invalid_api_key') {
      return this.createError(
        ErrorCategory.AUTHENTICATION,
        'Invalid API Key',
        'Your OpenAI API key is invalid or inactive',
        'Update your API key in Settings > Admin Panel',
        'https://platform.openai.com/api-keys',
        false,
        errorMessage
      );
    }

    // Insufficient quota
    if (
      errorCode === 'insufficient_quota' ||
      errorMessage.toLowerCase().includes('quota')
    ) {
      return this.createError(
        ErrorCategory.BILLING,
        'Quota Exceeded',
        'Your OpenAI account has exceeded its usage quota',
        'Add credits or upgrade your plan at platform.openai.com',
        'https://platform.openai.com/account/billing',
        false,
        errorMessage
      );
    }

    // Rate limits
    if (statusCode === 429 || errorType === 'rate_limit_exceeded') {
      return this.createError(
        ErrorCategory.RATE_LIMIT,
        'Rate Limit Exceeded',
        'Too many requests to OpenAI API',
        'Wait before retrying, or upgrade for higher limits',
        'https://platform.openai.com/docs/guides/rate-limits',
        true,
        errorMessage
      );
    }

    // Model not found
    if (statusCode === 404 || errorMessage.includes('model') && errorMessage.includes('does not exist')) {
      return this.createError(
        ErrorCategory.RESOURCE_NOT_FOUND,
        'Model Not Found',
        'The specified model is not available',
        'Check available models and update your selection',
        'https://platform.openai.com/docs/models',
        false,
        errorMessage
      );
    }

    // Service errors
    if (statusCode && statusCode >= 500) {
      return this.createError(
        ErrorCategory.SERVICE_UNAVAILABLE,
        'Service Unavailable',
        'OpenAI API is temporarily unavailable',
        'Try again in a few moments',
        'https://status.openai.com',
        true,
        errorMessage
      );
    }

    // Invalid request
    if (statusCode === 400) {
      return this.createError(
        ErrorCategory.INVALID_REQUEST,
        'Invalid Request',
        errorMessage || 'The request was malformed',
        'Check your prompt and parameters',
        'https://platform.openai.com/docs/api-reference',
        false,
        errorMessage
      );
    }

    return this.createError(
      ErrorCategory.UNKNOWN,
      'Unknown Error',
      errorMessage || 'An unexpected error occurred',
      'Check OpenAI status page or contact support',
      'https://status.openai.com',
      false,
      errorMessage
    );
  }
}

/**
 * Google/Gemini error classifier
 */
class GoogleErrorClassifier extends ProviderErrorClassifier {
  parseError(response: any, _statusCode?: number): ProviderError {
    if (this.isNetworkError(response)) {
      return this.createError(
        ErrorCategory.NETWORK,
        'Connection Failed',
        'Unable to reach Google AI API',
        'Check your internet connection and try again',
        'https://ai.google.dev/gemini-api/docs',
        true
      );
    }

    const googleError = response as GoogleErrorResponse;
    const errorStatus = googleError?.error?.status;
    const errorMessage = googleError?.error?.message || '';
    const errorCode = googleError?.error?.code;

    // Authentication
    if (errorStatus === 'UNAUTHENTICATED' || errorCode === 401) {
      return this.createError(
        ErrorCategory.AUTHENTICATION,
        'Invalid API Key',
        'Your Google AI API key is invalid',
        'Update your API key in Settings > Admin Panel',
        'https://makersuite.google.com/app/apikey',
        false,
        errorMessage
      );
    }

    // API not enabled
    if (errorMessage.includes('API has not been used') || errorMessage.includes('not enabled')) {
      return this.createError(
        ErrorCategory.INVALID_REQUEST,
        'API Not Enabled',
        'Gemini API is not enabled for your project',
        'Enable the API in Google Cloud Console',
        'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
        false,
        errorMessage
      );
    }

    // Quota exceeded
    if (errorStatus === 'RESOURCE_EXHAUSTED' || errorCode === 429) {
      return this.createError(
        ErrorCategory.RATE_LIMIT,
        'Quota Exceeded',
        'Your API quota has been exceeded',
        'Wait for quota reset or request an increase',
        'https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas',
        true,
        errorMessage
      );
    }

    // Invalid request
    if (errorStatus === 'INVALID_ARGUMENT' || errorCode === 400) {
      return this.createError(
        ErrorCategory.INVALID_REQUEST,
        'Invalid Request',
        errorMessage || 'The request was invalid',
        'Check your model name and parameters',
        'https://ai.google.dev/gemini-api/docs/models',
        false,
        errorMessage
      );
    }

    // Service unavailable
    if (errorCode && errorCode >= 500) {
      return this.createError(
        ErrorCategory.SERVICE_UNAVAILABLE,
        'Service Unavailable',
        'Google AI API is temporarily unavailable',
        'Try again in a few moments',
        'https://status.cloud.google.com',
        true,
        errorMessage
      );
    }

    return this.createError(
      ErrorCategory.UNKNOWN,
      'Unknown Error',
      errorMessage || 'An unexpected error occurred',
      'Check Google Cloud status or contact support',
      'https://status.cloud.google.com',
      false,
      errorMessage
    );
  }
}

/**
 * Azure OpenAI error classifier
 */
class AzureErrorClassifier extends ProviderErrorClassifier {
  parseError(response: any, statusCode?: number): ProviderError {
    if (this.isNetworkError(response)) {
      return this.createError(
        ErrorCategory.NETWORK,
        'Connection Failed',
        'Unable to reach Azure OpenAI endpoint',
        'Check your endpoint URL and network connection',
        'https://learn.microsoft.com/azure/ai-services/openai/',
        true
      );
    }

    const errorMessage = response?.error?.message || response?.message || '';

    // Authentication
    if (statusCode === 401) {
      return this.createError(
        ErrorCategory.AUTHENTICATION,
        'Invalid Credentials',
        'Azure OpenAI authentication failed',
        'Check your API key and endpoint in Settings',
        'https://portal.azure.com',
        false,
        errorMessage
      );
    }

    // Deployment not found
    if (statusCode === 404 || errorMessage.includes('deployment')) {
      return this.createError(
        ErrorCategory.RESOURCE_NOT_FOUND,
        'Deployment Not Found',
        'The specified Azure OpenAI deployment does not exist',
        'Verify your deployment name in Azure Portal',
        'https://portal.azure.com',
        false,
        errorMessage
      );
    }

    // Rate limit
    if (statusCode === 429) {
      return this.createError(
        ErrorCategory.RATE_LIMIT,
        'Rate Limit Exceeded',
        'Azure OpenAI rate limit exceeded',
        'Wait before retrying or increase your TPM quota',
        'https://learn.microsoft.com/azure/ai-services/openai/quotas-limits',
        true,
        errorMessage
      );
    }

    // Service errors
    if (statusCode && statusCode >= 500) {
      return this.createError(
        ErrorCategory.SERVICE_UNAVAILABLE,
        'Service Unavailable',
        'Azure OpenAI service is temporarily unavailable',
        'Check Azure status or try again later',
        'https://status.azure.com',
        true,
        errorMessage
      );
    }

    return this.createError(
      ErrorCategory.UNKNOWN,
      'Unknown Error',
      errorMessage || 'An unexpected error occurred',
      'Check Azure Portal or contact support',
      'https://portal.azure.com',
      false,
      errorMessage
    );
  }
}

/**
 * Ollama error classifier
 */
class OllamaErrorClassifier extends ProviderErrorClassifier {
  parseError(response: any, _statusCode?: number): ProviderError {
    if (this.isNetworkError(response)) {
      return this.createError(
        ErrorCategory.NETWORK,
        'Ollama Not Running',
        'Cannot connect to Ollama server',
        'Start Ollama with "ollama serve" or check if it\'s running',
        'https://ollama.ai',
        false
      );
    }

    const errorMessage = typeof response === 'string' ? response : response?.error || '';

    // Model not found
    if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      return this.createError(
        ErrorCategory.RESOURCE_NOT_FOUND,
        'Model Not Installed',
        'The requested model is not installed',
        'Install the model with "ollama pull <model-name>"',
        'https://ollama.ai/library',
        false,
        errorMessage
      );
    }

    // Insufficient memory
    if (errorMessage.includes('memory') || errorMessage.includes('VRAM')) {
      return this.createError(
        ErrorCategory.INSUFFICIENT_RESOURCES,
        'Insufficient Memory',
        'Not enough RAM or VRAM to load the model',
        'Try a smaller model or close other applications',
        'https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server',
        false,
        errorMessage
      );
    }

    // Service unavailable
    if (_statusCode && _statusCode >= 500) {
      return this.createError(
        ErrorCategory.SERVICE_UNAVAILABLE,
        'Ollama Service Error',
        'Ollama server encountered an error',
        'Check Ollama logs or restart the service',
        'https://github.com/ollama/ollama/blob/main/docs/troubleshooting.md',
        true,
        errorMessage
      );
    }

    return this.createError(
      ErrorCategory.UNKNOWN,
      'Ollama Error',
      errorMessage || 'An unexpected error occurred',
      'Check Ollama is running and the model is available',
      'https://ollama.ai',
      false,
      errorMessage
    );
  }
}

/**
 * Error classifier factory
 */
const errorClassifiers: Record<LLMProviderType, ProviderErrorClassifier> = {
  anthropic: new AnthropicErrorClassifier(),
  openai: new OpenAIErrorClassifier(),
  google: new GoogleErrorClassifier(),
  azure: new AzureErrorClassifier(),
  ollama: new OllamaErrorClassifier(),
  custom: new OpenAIErrorClassifier(), // Assume OpenAI-compatible for custom
};

/**
 * Main error parser - routes to appropriate classifier
 */
export function parseProviderError(
  providerType: LLMProviderType,
  error: any,
  statusCode?: number
): ProviderError {
  const classifier = errorClassifiers[providerType];
  if (!classifier) {
    // Fallback for unknown providers
    return {
      category: ErrorCategory.UNKNOWN,
      title: 'Provider Error',
      message: 'An error occurred with the provider',
      retryable: false,
      technicalDetails: String(error),
    };
  }

  return classifier.parseError(error, statusCode);
}

/**
 * Get user-friendly error message for display
 */
export function getErrorDisplayMessage(error: ProviderError): string {
  let message = `${error.title}: ${error.message}`;
  if (error.userAction) {
    message += `\n\n${error.userAction}`;
  }
  return message;
}

/**
 * Get short error summary for compact display (e.g., status bar)
 */
export function getErrorSummary(error: ProviderError): string {
  return error.title;
}

/**
 * Check if error is worth showing to user in UI
 */
export function shouldDisplayError(error: ProviderError): boolean {
  // Don't spam for network errors that might resolve quickly
  if (error.category === ErrorCategory.NETWORK && error.retryable) {
    return false;
  }
  return true;
}
