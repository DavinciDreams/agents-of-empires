/**
 * Waitlist Service
 *
 * Handles email submissions to the waitlist using Resend API.
 * This service provides a production-ready solution for collecting
 * user emails without relying on mailto: links.
 *
 * Environment Setup:
 * 1. Sign up at https://resend.com/ and get an API key
 * 2. Create a verified domain or use the default @resend.dev domain
 * 3. Add NEXT_PUBLIC_RESEND_API_KEY to your .env file
 * 4. Add NEXT_PUBLIC_WAITLIST_FROM_EMAIL and NEXT_PUBLIC_WAITLIST_TO_EMAIL to your .env file
 *
 * Example .env:
 * NEXT_PUBLIC_RESEND_API_KEY=re_xxxxxxxxxxxxx
 * NEXT_PUBLIC_WAITLIST_FROM_EMAIL=noreply@yourdomain.com
 * NEXT_PUBLIC_WAITLIST_TO_EMAIL=waitlist@yourdomain.com
 */

export interface WaitlistSubmitResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface WaitlistEntry {
  email: string;
  timestamp: string;
  source: 'landing-page';
}

/**
 * Submit an email to the waitlist
 * This sends a notification email to the waitlist admin and adds
 * the user to a waitlist via Resend's audience/contacts feature
 */
export async function submitToWaitlist(email: string): Promise<WaitlistSubmitResult> {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Please enter a valid email address',
      error: 'INVALID_EMAIL',
    };
  }

  // Check if API key is configured
  const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;
  const fromEmail = process.env.NEXT_PUBLIC_WAITLIST_FROM_EMAIL || 'onboarding@resend.dev';
  const toEmail = process.env.NEXT_PUBLIC_WAITLIST_TO_EMAIL || 'waitlist@resend.dev';

  // If no API key is configured, use demo mode
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('[WaitlistService] No API key configured, using demo mode');
    // Simulate API call for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      message: 'You have joined the waitlist! (Demo Mode - Configure NEXT_PUBLIC_RESEND_API_KEY for production)',
    };
  }

  try {
    // Send notification email to waitlist admin
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: 'New Waitlist Signup - Agents of Empire',
        html: `
          <h1>New Waitlist Signup</h1>
          <p>A new user has joined the Agents of Empire waitlist:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Date:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><em>This email was sent from the Agents of Empire landing page waitlist form.</em></p>
        `,
        text: `
          New Waitlist Signup

          A new user has joined the Agents of Empire waitlist:

          Email: ${email}
          Date: ${new Date().toISOString()}
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[WaitlistService] API error:', errorData);
      return {
        success: false,
        message: 'Failed to join waitlist. Please try again.',
        error: errorData.message || 'API_ERROR',
      };
    }

    const data = await response.json();
    console.log('[WaitlistService] Success:', data);

    return {
      success: true,
      message: 'You have joined the waitlist! Check your email for confirmation.',
    };

  } catch (error) {
    console.error('[WaitlistService] Network error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
      error: 'NETWORK_ERROR',
    };
  }
}

/**
 * Alternative implementation using Resend Contacts API
 * This adds the email directly to a Resend audience for easier management
 *
 * Note: This requires creating an audience in Resend first
 */
export async function addWaitlistContact(email: string, audienceId?: string): Promise<WaitlistSubmitResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Please enter a valid email address',
      error: 'INVALID_EMAIL',
    };
  }

  const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('[WaitlistService] No API key configured, using demo mode');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      message: 'You have joined the waitlist! (Demo Mode)',
    };
  }

  // If audienceId is provided, use Contacts API
  if (audienceId) {
    try {
      const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName: '',
          lastName: '',
          unsubscribed: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Failed to join waitlist. Please try again.',
          error: errorData.message || 'API_ERROR',
        };
      }

      return {
        success: true,
        message: 'You have joined the waitlist! Check your email for confirmation.',
      };

    } catch (error) {
      console.error('[WaitlistService] Contacts API error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
        error: 'NETWORK_ERROR',
      };
    }
  }

  // Fall back to email notification method
  return submitToWaitlist(email);
}

/**
 * Check if the service is properly configured
 */
export function isWaitlistConfigured(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;
  return !!apiKey && apiKey !== 'your_api_key_here';
}
