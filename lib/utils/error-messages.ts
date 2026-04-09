/**
 * Standardized error messages for billing and payment flows
 * 
 * Usage:
 * ```ts
 * import { getErrorMessage } from '@/lib/utils/error-messages';
 * 
 * toast.error(errorMessage.title, {
 *   description: errorMessage.description,
 *   duration: errorMessage.duration,
 * });
 * ```
 */

export interface ErrorMessage {
  title: string;
  description: string;
  duration?: number;
}

export const BillingErrors = {
  // Authentication errors (401)
  AUTH_REQUIRED: {
    title: 'Authentication required',
    description: 'Please sign in again to continue.',
    duration: 5000,
  } as ErrorMessage,

  AUTH_REQUIRED_PORTAL: {
    title: 'Authentication required',
    description: 'Please sign in again to access billing portal.',
    duration: 5000,
  } as ErrorMessage,

  // Service unavailable errors (503)
  PAYMENT_SYSTEM_UNAVAILABLE: {
    title: 'Payment system temporarily unavailable',
    description: 'Please try again in a few moments.',
    duration: 5000,
  } as ErrorMessage,

  BILLING_PORTAL_UNAVAILABLE: {
    title: 'Billing portal temporarily unavailable',
    description: 'Please try again in a few moments.',
    duration: 5000,
  } as ErrorMessage,

  // Network/Connection errors
  CONNECTION_ERROR: {
    title: 'Unable to connect to payment system',
    description: 'Please check your connection and try again.',
    duration: 5000,
  } as ErrorMessage,

  BILLING_CONNECTION_ERROR: {
    title: 'Unable to connect to billing system',
    description: 'Please check your connection and try again.',
    duration: 5000,
  } as ErrorMessage,

  // Validation errors (400)
  INVALID_PLAN: {
    title: 'Invalid plan selection',
    description: 'Please select a valid subscription plan.',
    duration: 5000,
  } as ErrorMessage,

  INVALID_CREDIT_PACK: {
    title: 'Invalid credit pack selected',
    description: 'Please select a valid credit package.',
    duration: 5000,
  } as ErrorMessage,

  // Generic operation failures
  SUBSCRIPTION_CHECKOUT_FAILED: {
    title: 'Unable to start subscription checkout',
    description: 'An error occurred. Please try again.',
    duration: 5000,
  } as ErrorMessage,

  CREDIT_PURCHASE_FAILED: {
    title: 'Unable to purchase credits',
    description: 'An error occurred. Please try again.',
    duration: 5000,
  } as ErrorMessage,

  BILLING_PORTAL_FAILED: {
    title: 'Unable to open billing portal',
    description: 'An error occurred. Please try again.',
    duration: 5000,
  } as ErrorMessage,

  // Payment processing
  PAYMENT_PROCESSING: {
    title: 'Payment is processing',
    description: 'Your payment may still be processing. Please refresh in a few minutes or contact support if this persists.',
    duration: 8000,
  } as ErrorMessage,

  PAYMENT_DELAYED: {
    title: 'Payment processed',
    description: 'There was a delay, but your subscription is now active.',
    duration: 6000,
  } as ErrorMessage,

  // Success messages
  PAYMENT_SUCCESS: {
    title: 'Payment successful!',
    description: 'Your subscription is now active.',
    duration: 5000,
  } as ErrorMessage,

  PAYMENT_PROCESSING_TOAST: {
    title: 'Processing your payment...',
    description: 'This may take a few moments.',
  } as ErrorMessage,
} as const;

/**
 * Get error message based on HTTP status code
 */
export function getPaymentErrorMessage(
  statusCode: number,
  defaultMessage?: string
): ErrorMessage {
  switch (statusCode) {
    case 401:
      return BillingErrors.AUTH_REQUIRED;
    case 400:
      return {
        ...BillingErrors.INVALID_PLAN,
        description: defaultMessage || BillingErrors.INVALID_PLAN.description,
      };
    case 503:
      return BillingErrors.PAYMENT_SYSTEM_UNAVAILABLE;
    default:
      return {
        ...BillingErrors.SUBSCRIPTION_CHECKOUT_FAILED,
        description: defaultMessage || BillingErrors.SUBSCRIPTION_CHECKOUT_FAILED.description,
      };
  }
}

/**
 * Get credit purchase error message based on HTTP status code
 */
export function getCreditPurchaseErrorMessage(
  statusCode: number,
  defaultMessage?: string
): ErrorMessage {
  switch (statusCode) {
    case 401:
      return BillingErrors.AUTH_REQUIRED;
    case 400:
      return {
        ...BillingErrors.INVALID_CREDIT_PACK,
        description: defaultMessage || BillingErrors.INVALID_CREDIT_PACK.description,
      };
    case 503:
      return BillingErrors.PAYMENT_SYSTEM_UNAVAILABLE;
    default:
      return {
        ...BillingErrors.CREDIT_PURCHASE_FAILED,
        description: defaultMessage || BillingErrors.CREDIT_PURCHASE_FAILED.description,
      };
  }
}

/**
 * Get billing portal error message based on HTTP status code
 */
export function getBillingPortalErrorMessage(
  statusCode: number,
  defaultMessage?: string
): ErrorMessage {
  switch (statusCode) {
    case 401:
      return BillingErrors.AUTH_REQUIRED_PORTAL;
    case 503:
      return BillingErrors.BILLING_PORTAL_UNAVAILABLE;
    default:
      return {
        ...BillingErrors.BILLING_PORTAL_FAILED,
        description: defaultMessage || BillingErrors.BILLING_PORTAL_FAILED.description,
      };
  }
}
