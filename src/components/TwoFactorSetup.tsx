import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { setup2FA, verify2FA } from '@/api/2fa';
import { TwoFactorSetupResult } from '@/types';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  onSuccess: () => void;
}

type SetupStep = 'intro' | 'scan' | 'verify' | 'backup';

export function TwoFactorSetup({ 
  isOpen, 
  onClose, 
  userEmail, 
  userId,
  onSuccess 
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [setupData, setSetupData] = useState<TwoFactorSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCopied, setBackupCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('intro');
      setSetupData(null);
      setVerificationCode('');
      setCopied(false);
      setBackupCopied(false);
    }
  }, [isOpen]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const data = await setup2FA();
      setSetupData(data);
      setStep('scan');
    } catch (error) {
      console.error('2FA setup init error:', error);
      toast.error('Unable to start 2FA setup right now.');
    } finally {
      setIsStarting(false);
    }
  };

  const qrUrl = setupData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauth_uri)}`
    : '';

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (!setupData?.backup_codes?.length) return;
    navigator.clipboard.writeText(setupData.backup_codes.join('\n'));
    setBackupCopied(true);
    toast.success('Backup codes copied to clipboard');
    setTimeout(() => setBackupCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);

    try {
      const isValid = await verify2FA(verificationCode);

      if (!isValid) {
        toast.error('Invalid code. Please try again.');
        setIsVerifying(false);
        return;
      }

      setStep('backup');
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('Failed to enable 2FA. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
    setStep('intro');
    setVerificationCode('');
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Secure Your Account</h3>
              <p className="text-muted-foreground">
                Add an extra layer of security with two-factor authentication. 
                You'll need an authenticator app like Google Authenticator or Authy.
              </p>
            </div>
            <Button onClick={() => setStep('scan')} className="w-full">
              Get Started
            </Button>
          </motion.div>
        );

      case 'scan':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <img src={qrUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Or enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono text-center break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopySecret}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              I've scanned the code
            </Button>
          </motion.div>
        );

      case 'verify':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Verify Setup</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />

            <Button 
              onClick={handleVerify} 
              className="w-full"
              disabled={verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Enable 2FA'
              )}
            </Button>

            <Button variant="ghost" onClick={() => setStep('scan')} className="w-full">
              Back to QR Code
            </Button>
          </motion.div>
        );

      case 'backup':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <p className="text-sm">
                <strong>Save these backup codes!</strong> You'll need them if you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleCopyBackupCodes} 
              className="w-full"
            >
              {backupCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Codes
                </>
              )}
            </Button>

            <Button onClick={handleComplete} className="w-full">
              I've Saved My Codes
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Protect your account with 2FA
          </DialogDescription>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
