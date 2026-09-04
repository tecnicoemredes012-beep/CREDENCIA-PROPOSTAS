import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Field, inputClassName, textareaClassName } from '../ui/Form';
import { Button } from '../ui/Button';
import { Client } from '../../types';
import { Save } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void>;
  client?: Client | null;
}

export function ClientFormModal({ isOpen, onClose, onSave, client }: ClientFormModalProps) {
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setTradeName(client.tradeName || '');
      setDocument(client.document || '');
      setContactPerson(client.contactPerson || '');
      setRole(client.role || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setCity(client.city || '');
      setState(client.state || '');
      setZipCode(client.zipCode || '');
      setNotes(client.notes || '');
    } else {
      setName('');
      setTradeName('');
      setDocument('');
      setContactPerson('');
      setRole('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setState('');
      setZipCode('');
      setNotes('');
    }
    setError('');
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !document.trim() || !contactPerson.trim() || !email.trim()) {
      setError('Preencha os campos obrigatórios: Razão Social, CPF/CNPJ, Responsável e E-mail.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await onSave({
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        document: document.trim(),
        contactPerson: contactPerson.trim(),
        role: role.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || '',
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Editar Cliente' : 'Novo Cliente'}
      subtitle="Cadastre os dados cadastrais e de faturamento do cliente"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Razão Social / Nome Completo" required>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Confederação Nacional de Eventos"
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Nome Fantasia">
            <input
              type="text"
              value={tradeName}
              onChange={e => setTradeName(e.target.value)}
              placeholder="Ex: CNE Eventos"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="CPF ou CNPJ" required>
            <input
              type="text"
              value={document}
              onChange={e => setDocument(e.target.value)}
              placeholder="00.000.000/0001-00"
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Responsável" required>
            <input
              type="text"
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              placeholder="Nome do contato"
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Cargo">
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Ex: Diretor de Produção"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="E-mail de Contato / Faturamento" required>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contato@empresa.com.br"
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua, Av, Número, Complemento"
                className={inputClassName}
              />
            </Field>
          </div>

          <Field label="Cidade">
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="São Paulo"
              className={inputClassName}
            />
          </Field>

          <Field label="UF">
            <input
              type="text"
              maxLength={2}
              value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              placeholder="SP"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CEP">
            <input
              type="text"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              placeholder="00000-000"
              className={inputClassName}
            />
          </Field>

          <Field label="Observações Cadastrais">
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações internas sobre o cliente"
              className={inputClassName}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save size={16} />} disabled={isSaving}>
            {isSaving ? 'Salvando...' : client ? 'Atualizar Cliente' : 'Salvar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
