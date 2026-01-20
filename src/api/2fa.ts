import { supabase } from '@/integrations/supabase/client';
import { TwoFactorStatus } from '@/types';

interface RpcRow<T> {
  [key: string]: T;
}

function unwrapSingleRow<T>(data: T | T[] | RpcRow<T> | null): T | null {
  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] as T : null;
  }
  if (data && typeof data === 'object' && 'otpauth_uri' in data) {
    return data as T;
  }
  return data as T | null;
}

export interface Setup2FAResult {
  otpauth_uri: string;
  secret: string;
  backup_codes: string[];
}

export interface VerifyBackupCodeResult {
  success: boolean;
  remaining_codes: number;
}

export async function setup2FA(): Promise<Setup2FAResult> {
  const { data, error } = await supabase.rpc('setup_2fa');
  if (error) {
    throw error;
  }
  const payload = unwrapSingleRow<Setup2FAResult>(data);
  if (!payload) {
    throw new Error('Failed to start 2FA setup');
  }
  return payload;
}

export async function verify2FA(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_2fa', { code });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function verifyBackupCode(code: string): Promise<VerifyBackupCodeResult> {
  const { data, error } = await supabase.rpc('verify_backup_code', { code });
  if (error) {
    throw error;
  }
  const payload = unwrapSingleRow<VerifyBackupCodeResult>(data);
  if (!payload) {
    throw new Error('Backup code verification failed');
  }
  return payload;
}

export async function disable2FA(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('disable_2fa', { code });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function get2FAStatus(): Promise<TwoFactorStatus> {
  const { data, error } = await supabase.rpc('get_2fa_status');
  if (error) {
    throw error;
  }
  const payload = unwrapSingleRow<TwoFactorStatus>(data);
  if (!payload) {
    throw new Error('Could not read 2FA status');
  }
  return payload;
}
