import { generateOtp } from './auth';
import { env, isProduction } from './env';
import { HttpError } from './http';

/**
 * Where sign-in codes come from. With Twilio set up, Twilio Verify makes, texts and checks the
 * code, so we never see it. Without it (local development only) we make the code ourselves and
 * hand it back so it can be logged and shown in the app.
 */
export type OtpDelivery = { provider: 'twilio' } | { provider: 'dev'; code: string };

function twilioConfig() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = env();
  const set = [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID].filter(Boolean);
  if (set.length === 0) return null;
  if (set.length < 3) {
    throw new Error(
      'Set all of TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID, or none',
    );
  }
  return {
    accountSid: TWILIO_ACCOUNT_SID!,
    authToken: TWILIO_AUTH_TOKEN!,
    serviceSid: TWILIO_VERIFY_SERVICE_SID!,
  };
}

class TwilioError extends Error {
  status: number;
  code?: number;

  constructor(status: number, code: number | undefined, message: string) {
    super(`Twilio ${status}${code ? ` (${code})` : ''}: ${message}`);
    this.name = 'TwilioError';
    this.status = status;
    this.code = code;
  }
}

/** Calls the Verify API with plain fetch, so it runs the same in the dev server and on EAS Hosting. */
async function verifyApi(path: 'Verifications' | 'VerificationCheck', form: Record<string, string>) {
  const config = twilioConfig()!;
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.serviceSid}/${path}`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
    },
  );
  const json = (await response.json().catch(() => ({}))) as {
    status?: string;
    code?: number;
    message?: string;
  };
  if (!response.ok) {
    throw new TwilioError(response.status, json.code, json.message ?? response.statusText);
  }
  return json;
}

/** Outside production, shows Twilio's reason in the app so setup problems are easy to spot. */
const withReason = (message: string, error: TwilioError) =>
  isProduction() ? `${message} Try again in a moment.` : `${message} ${error.message}`;

/** Members' numbers are stored as ten digits; Twilio wants E.164. */
const toE164 = (phone: string) => `+91${phone}`;

/** Texts a sign-in code to the phone. */
export async function sendOtp(phone: string): Promise<OtpDelivery> {
  if (!twilioConfig()) {
    // Never fall back to a code we hand back in the response when real members are signing in.
    if (isProduction()) throw new HttpError(503, 'Sign-in by SMS is not set up yet');
    const code = generateOtp();
    console.info(`[auth] OTP for ${phone}: ${code} (Twilio not configured, no SMS sent)`);
    return { provider: 'dev', code };
  }

  try {
    await verifyApi('Verifications', { To: toE164(phone), Channel: 'sms' });
    return { provider: 'twilio' };
  } catch (error) {
    if (!(error instanceof TwilioError)) throw error;
    console.error(`[auth] Could not send OTP to ${phone}:`, error.message);
    // 60203: too many sends to this number. 60200/21211/60205: not a number we can text.
    if (error.code === 60203 || error.status === 429) {
      throw new HttpError(429, 'Too many codes sent to this number. Try again in a few minutes.');
    }
    if (error.code === 60200 || error.code === 21211 || error.code === 60205) {
      throw new HttpError(400, 'We can’t send an SMS to this number. Check it and try again.');
    }
    throw new HttpError(503, withReason('We couldn’t send the code right now.', error));
  }
}

export type OtpCheck = 'approved' | 'wrong' | 'expired';

/** Asks Twilio whether the code it sent to this phone is right. */
export async function checkTwilioOtp(phone: string, code: string): Promise<OtpCheck> {
  try {
    const { status } = await verifyApi('VerificationCheck', { To: toE164(phone), Code: code });
    return status === 'approved' ? 'approved' : 'wrong';
  } catch (error) {
    if (!(error instanceof TwilioError)) throw error;
    // 404 (20404): no pending code, because it expired or was used. 60202: too many wrong tries.
    if (error.status === 404 || error.code === 20404 || error.code === 60202) return 'expired';
    console.error(`[auth] Could not check OTP for ${phone}:`, error.message);
    throw new HttpError(503, withReason('We couldn’t check the code right now.', error));
  }
}
