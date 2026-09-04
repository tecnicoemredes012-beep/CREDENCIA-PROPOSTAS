import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSettings } from '../types';
import { Button } from '../components/ui/Button';
import { Field, inputClassName, textareaClassName } from '../components/ui/Form';
import { LoadingState } from '../components/ui/Loading';
import { Save, Building, FileText, CheckCircle2, FileSignature, Scale, Layers } from 'lucide-react';

interface SettingsPageProps {
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onSettingsUpdated?: (settings: SystemSettings) => void;
  onManageTemplates?: () => void;
}

export function SettingsPage({ onAddToast, onSettingsUpdated, onManageTemplates }: SettingsPageProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states - Company
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [municipalRegistration, setMunicipalRegistration] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Proposals
  const [proposalPrefix, setProposalPrefix] = useState('PROP');
  const [defaultValidityDays, setDefaultValidityDays] = useState(15);
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState(0);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('Faturamento em 30 dias');
  const [footerText, setFooterText] = useState('');
  const [generalConditions, setGeneralConditions] = useState('');

  // Contracts & Legal
  const [contractPrefix, setContractPrefix] = useState('CTR');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [legalRepresentativeCpf, setLegalRepresentativeCpf] = useState('');
  const [legalRepresentativeRole, setLegalRepresentativeRole] = useState('Diretor');
  const [legalRepresentativeEmail, setLegalRepresentativeEmail] = useState('');
  const [legalRepresentativePhone, setLegalRepresentativePhone] = useState('');
  const [defaultCourt, setDefaultCourt] = useState('Comarca de São Paulo/SP');
  const [defaultSignatureCity, setDefaultSignatureCity] = useState('São Paulo/SP');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.settings.get();
      setSettings(res);
      setCompanyName(res.companyName || '');
      setTradeName(res.tradeName || '');
      setCnpj(res.cnpj || '');
      setStateRegistration(res.stateRegistration || '');
      setMunicipalRegistration(res.municipalRegistration || '');
      setAddress(res.address || '');
      setPhone(res.phone || '');
      setEmail(res.email || '');
      setWebsite(res.website || '');

      setProposalPrefix(res.proposalPrefix || 'PROP');
      setDefaultValidityDays(res.defaultValidityDays || 15);
      setDefaultDiscountPercent(res.defaultDiscountPercent || 0);
      setDefaultPaymentTerms(res.defaultPaymentTerms || 'Faturamento em 30 dias');
      setFooterText(res.footerText || '');
      setGeneralConditions(res.generalConditions || '');

      setContractPrefix(res.contractPrefix || 'CTR');
      setLegalRepresentative(res.legalRepresentative || '');
      setLegalRepresentativeCpf(res.legalRepresentativeCpf || '');
      setLegalRepresentativeRole(res.legalRepresentativeRole || 'Diretor');
      setLegalRepresentativeEmail(res.legalRepresentativeEmail || '');
      setLegalRepresentativePhone(res.legalRepresentativePhone || '');
      setDefaultCourt(res.defaultCourt || 'Comarca de São Paulo/SP');
      setDefaultSignatureCity(res.defaultSignatureCity || 'São Paulo/SP');
    } catch (err: any) {
      onAddToast('error', 'Erro ao carregar configurações: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.settings.update({
        companyName,
        tradeName,
        cnpj,
        stateRegistration,
        municipalRegistration,
        address,
        phone,
        email,
        website,
        proposalPrefix: proposalPrefix.toUpperCase(),
        defaultValidityDays: Number(defaultValidityDays),
        defaultDiscountPercent: Number(defaultDiscountPercent),
        defaultPaymentTerms,
        footerText,
        generalConditions,
        contractPrefix: contractPrefix.toUpperCase(),
        legalRepresentative,
        legalRepresentativeCpf,
        legalRepresentativeRole,
        legalRepresentativeEmail,
        legalRepresentativePhone,
        defaultCourt,
        defaultSignatureCity
      });
      setSettings(updated);
      onSettingsUpdated?.(updated);
      onAddToast('success', 'Configurações atualizadas com sucesso!');
    } catch (err: any) {
      onAddToast('error', 'Erro ao atualizar configurações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando configurações do sistema..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
          Configurações Comerciais e do Sistema
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Gerencie os dados institucionais, prefixo das propostas e cláusulas padrão
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Dados Institucionais */}
        <div className="cx-card p-6 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building size={18} className="text-emerald-700" />
            <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Dados da Empresa Emissora
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Razão Social" required>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className={inputClassName}
                required
              />
            </Field>

            <Field label="Nome Comercial">
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="CNPJ" required>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                className={inputClassName}
                required
              />
            </Field>

            <Field label="Telefone Comercial" required>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClassName}
                required
              />
            </Field>

            <Field label="E-mail de Contato" required>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClassName}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Inscrição Estadual">
              <input
                type="text"
                value={stateRegistration}
                onChange={e => setStateRegistration(e.target.value)}
                placeholder="Isento ou nº IE"
                className={inputClassName}
              />
            </Field>

            <Field label="Inscrição Municipal">
              <input
                type="text"
                value={municipalRegistration}
                onChange={e => setMunicipalRegistration(e.target.value)}
                placeholder="Nº CCM / IM"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Endereço Completo">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Website Institucional">
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>
        </div>

        {/* 2. Regras de Numeração e Prazos das Propostas */}
        <div className="cx-card p-6 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText size={18} className="text-emerald-700" />
            <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Padrões Comerciais das Propostas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Prefixo da Proposta" required hint="Ex: PROP -> PROP-2026-0001">
              <input
                type="text"
                value={proposalPrefix}
                onChange={e => setProposalPrefix(e.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase font-bold`}
                required
              />
            </Field>

            <Field label="Validade Padrão (Dias)" required>
              <input
                type="number"
                min="1"
                max="90"
                value={defaultValidityDays}
                onChange={e => setDefaultValidityDays(parseInt(e.target.value) || 15)}
                className={inputClassName}
                required
              />
            </Field>

            <Field label="Prazo Padrão de Pagamento">
              <input
                type="text"
                value={defaultPaymentTerms}
                onChange={e => setDefaultPaymentTerms(e.target.value)}
                placeholder="Faturamento em 30 dias"
                className={inputClassName}
              />
            </Field>
          </div>

          <Field label="Texto do Rodapé Oficial do PDF / Impressão">
            <input
              type="text"
              value={footerText}
              onChange={e => setFooterText(e.target.value)}
              placeholder="Ex: Credencia Tecnologia em Eventos • CNPJ 38.921.450/0001-22"
              className={inputClassName}
            />
          </Field>

          <Field label="Condições Gerais e Cláusulas Padrão da Proposta">
            <textarea
              rows={4}
              value={generalConditions}
              onChange={e => setGeneralConditions(e.target.value)}
              placeholder="Cláusulas contratuais, prazos de cancelamento e faturamento..."
              className={textareaClassName}
            />
          </Field>
        </div>

        {/* 3. Qualificação Jurídica da Contratada (Credencia) & Parâmetros dos Contratos */}
        <div className="cx-card p-6 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-[#12e000]" />
              <div>
                <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Qualificação Jurídica da Contratada & Parâmetros dos Contratos
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dados aplicados automaticamente no preâmbulo e nas cláusulas dos contratos oficiais
                </p>
              </div>
            </div>

            {onManageTemplates && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onManageTemplates}
                leftIcon={<Layers size={15} className="text-[#12e000]" />}
              >
                Modelos de Contrato
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Prefixo dos Contratos" required hint="Ex: CTR -> CTR-2026-0001">
              <input
                type="text"
                value={contractPrefix}
                onChange={e => setContractPrefix(e.target.value.toUpperCase())}
                className={`${inputClassName} font-mono uppercase font-bold`}
                required
              />
            </Field>

            <Field label="Foro de Eleição Padrão" hint="Ex: Comarca de São Paulo/SP">
              <input
                type="text"
                value={defaultCourt}
                onChange={e => setDefaultCourt(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Cidade Padrão de Assinatura" hint="Ex: São Paulo/SP">
              <input
                type="text"
                value={defaultSignatureCity}
                onChange={e => setDefaultSignatureCity(e.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nome do Representante Legal da Credencia" hint="Ex: Fernando Silva">
              <input
                type="text"
                value={legalRepresentative}
                onChange={e => setLegalRepresentative(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="CPF do Representante Legal">
              <input
                type="text"
                value={legalRepresentativeCpf}
                onChange={e => setLegalRepresentativeCpf(e.target.value)}
                placeholder="000.000.000-00"
                className={inputClassName}
              />
            </Field>

            <Field label="Cargo do Representante">
              <input
                type="text"
                value={legalRepresentativeRole}
                onChange={e => setLegalRepresentativeRole(e.target.value)}
                placeholder="Diretor / Sócio-Administrador"
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="E-mail do Representante Legal">
              <input
                type="email"
                value={legalRepresentativeEmail}
                onChange={e => setLegalRepresentativeEmail(e.target.value)}
                placeholder="juridico@credencia.com.br"
                className={inputClassName}
              />
            </Field>

            <Field label="Telefone do Representante Legal">
              <input
                type="text"
                value={legalRepresentativePhone}
                onChange={e => setLegalRepresentativePhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className={inputClassName}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            leftIcon={<Save size={16} />}
            disabled={saving}
          >
            {saving ? 'Salvando Configurações...' : 'Salvar Todas as Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
