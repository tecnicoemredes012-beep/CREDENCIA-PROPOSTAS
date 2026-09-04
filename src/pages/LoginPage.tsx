import React, { useState } from 'react';
import { KeyRound, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import credenciaLogoLockup from '../assets/credencia-logo-lockup.png';
import credenciaLogoIcon from '../assets/credencia-logo-icon.png';
import { Button } from '../components/ui/Button';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onAddToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function LoginPage({ onLoginSuccess, onAddToast }: LoginPageProps) {
  const [method, setMethod] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          pin: method === 'pin' ? pin : undefined,
          email: method === 'email' ? email : undefined,
          password: method === 'email' ? password : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      onAddToast('success', `Bem-vindo, ${data.user.name}!`);
      onLoginSuccess(data.user);
    } catch (err: any) {
      onAddToast('error', err.message || 'Falha na autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f7f8f3] via-[#eef3ea] to-[#e4ede0] relative overflow-hidden">
      {/* Decorative ambient lights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#12e000]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#12e000]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="cx-card p-8 sm:p-10 shadow-2xl border border-white/60 backdrop-blur-xl">
          {/* Logo and system title */}
          <div className="text-center mb-8">
            <img
              src={credenciaLogoLockup}
              alt="Credencia"
              className="h-12 w-auto object-contain mx-auto mb-2"
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-widest mt-2">
              <Sparkles size={13} className="text-[#12e000]" />
              Credencia Orçamentos
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Acesso seguro ao módulo de propostas comerciais
            </p>
          </div>

          {/* Login method switch pills */}
          <div className="flex rounded-xl p-1 bg-slate-100/80 mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setMethod('pin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                method === 'pin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound size={14} />
              PIN Rápido
            </button>
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                method === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail size={14} />
              E-mail & Senha
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {method === 'pin' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  PIN de Acesso
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Digite seu PIN (Ex: 1234)"
                  autoFocus
                  required
                  className="w-full text-center text-xl font-mono tracking-[0.4em] py-3 rounded-xl border border-slate-200 bg-white/90 focus:border-emerald-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  PIN padrão do administrador: <strong className="text-slate-600">1234</strong>
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@credencia.com.br"
                    required
                    className="w-full text-sm py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white/90 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full text-sm py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white/90 focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Padrão: <strong className="text-slate-600">admin@credencia.com.br / 1234</strong>
                  </p>
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
              rightIcon={<ArrowRight size={16} />}
            >
              {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>
          </form>

          {/* Security badge */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Autenticação unificada Credencia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
