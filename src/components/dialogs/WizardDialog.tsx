import React, { useState } from 'react';
import { PlatformOS } from '../../types/winzip';
import { WizardIcon, AppLogoIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface WizardDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onExecuteWizard: (action: 'unzip' | 'create', pass?: string) => void;
}

export const WizardDialog: React.FC<WizardDialogProps> = ({
  os,
  isOpen,
  onClose,
  onExecuteWizard,
}) => {
  const [step, setStep] = useState<number>(1);
  const [wizardAction, setWizardAction] = useState<'unzip' | 'create'>('unzip');
  const [enableEncryption, setEnableEncryption] = useState<boolean>(true);
  const [wizardPassword, setWizardPassword] = useState<string>('MatterPackrPass2026');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onExecuteWizard(wizardAction, enableEncryption ? wizardPassword : undefined);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-lg shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
          os === 'macos'
            ? 'bg-white/95 dark:bg-[#1e1e24]/95 border-neutral-200/80 dark:border-neutral-700/80 text-[#1d1d1f] dark:text-[#f5f5f7]'
            : os === 'linux'
            ? 'bg-[#2a2638] border-[#1f1c29] text-[#deddda]'
            : 'bg-white dark:bg-[#202020] border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {/* Header following native OS guidelines */}
        <DialogHeader
          os={os}
          title={`MatterPackr Wizard — Step ${step} of 3`}
          icon={<WizardIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Content Body */}
        <div className="p-6 min-h-[220px] flex flex-col justify-between text-xs font-sans">
          {step === 1 && (
            <div className="space-y-3">
              <span className="font-bold text-sm block">What would you like to do?</span>
              <p className="text-neutral-500 leading-relaxed">
                The MatterPackr Wizard guides you through compressing and unpacking archives with optimized multi-threaded algorithms.
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="wAction"
                    checked={wizardAction === 'unzip'}
                    onChange={() => setWizardAction('unzip')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-neutral-800 dark:text-neutral-200">
                      Unzip or extract an archive
                    </span>
                    <span className="text-neutral-500 block text-[11px]">
                      Extract files to your local system with automatic integrity verification.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="wAction"
                    checked={wizardAction === 'create'}
                    onChange={() => setWizardAction('create')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-neutral-800 dark:text-neutral-200">
                      Create a new compressed archive
                    </span>
                    <span className="text-neutral-500 block text-[11px]">
                      Bundle files with multi-core parallel compression and AES-256 encryption.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <span className="font-bold text-sm block">
                {wizardAction === 'unzip' ? 'Extraction Parameters' : 'Compression Configuration'}
              </span>

              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Target Archive:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">PROJECT_ASSETS_81.ZIP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Concurrency Mode:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">8 Worker Cores (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Destination:</span>
                  <span>{os === 'macos' ? '~/Downloads/Extracted/' : 'C:\\Extracted\\'}</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-medium pt-1">
                <input
                  type="checkbox"
                  checked={enableEncryption}
                  onChange={(e) => setEnableEncryption(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <span>Enable 256-bit AES cryptographic protection</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <span className="font-bold text-sm block">Ready to Execute</span>
              <p className="text-neutral-500 leading-relaxed">
                Click <strong>Finish</strong> to dispatch tasks across parallel CPU worker threads.
              </p>

              {enableEncryption && (
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-1.5">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 block">
                    🔒 Passphrase Protection:
                  </span>
                  <input
                    type="password"
                    value={wizardPassword}
                    onChange={(e) => setWizardPassword(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-lg px-3 py-2 font-mono text-xs outline-none"
                    placeholder="Enter passphrase..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3.5 bg-neutral-50/80 dark:bg-neutral-900/60 border-t border-neutral-200/70 dark:border-neutral-800">
          <span className="text-[11px] text-neutral-400">MatterPackr</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={step === 1}
              onClick={handleBack}
              className={`px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-medium transition-colors ${
                step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              {step === 3 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
