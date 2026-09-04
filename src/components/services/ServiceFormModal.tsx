import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Field, inputClassName, selectClassName, textareaClassName } from '../ui/Form';
import { Button } from '../ui/Button';
import { ServiceItem } from '../../types';
import { Save } from 'lucide-react';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<ServiceItem>) => Promise<void>;
  service?: ServiceItem | null;
}

export function ServiceFormModal({ isOpen, onClose, onSave, service }: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [category, setCategory] = useState('Credenciamento');
  const [unit, setUnit] = useState('participante');
  const [unitPrice, setUnitPrice] = useState<number | string>(0);
  const [commercialNotes, setCommercialNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDefaultDescription(service.defaultDescription || '');
      setCategory(service.category || 'Credenciamento');
      setUnit(service.unit || 'participante');
      setUnitPrice(service.unitPrice !== undefined ? service.unitPrice : 0);
      setCommercialNotes(service.commercialNotes || '');
      setIsActive(service.isActive !== false);
    } else {
      setName('');
      setDefaultDescription('');
      setCategory('Credenciamento');
      setUnit('participante');
      setUnitPrice(0);
      setCommercialNotes('');
      setIsActive(true);
    }
    setError('');
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !defaultDescription.trim() || !unit.trim()) {
      setError('Preencha os campos obrigatórios: Nome, Descrição e Unidade.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await onSave({
        name: name.trim(),
        defaultDescription: defaultDescription.trim(),
        category: category.trim(),
        unit: unit.trim(),
        unitPrice: Number(unitPrice) || 0,
        commercialNotes: commercialNotes.trim() || undefined,
        isActive
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar serviço');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
      subtitle="Defina o escopo padrão, unidade de cobrança e valor referencial"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <Field label="Nome do Serviço" required>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Credenciamento por participante"
            className={inputClassName}
            required
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Categoria" required>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ex: Operacional"
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Unidade de Cobrança" required>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="participante, diária..."
              className={inputClassName}
              required
            />
          </Field>

          <Field label="Valor Unitário (R$)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value)}
              placeholder="0,00"
              className={inputClassName}
              required
            />
          </Field>
        </div>

        <Field label="Descrição Padrão / Escopo Comercial" required>
          <textarea
            rows={3}
            value={defaultDescription}
            onChange={e => setDefaultDescription(e.target.value)}
            placeholder="Descreva detalhadamente o que este serviço compreende..."
            className={textareaClassName}
            required
          />
        </Field>

        <Field label="Observações Comerciais / Regras de Aplicação">
          <input
            type="text"
            value={commercialNotes}
            onChange={e => setCommercialNotes(e.target.value)}
            placeholder="Orientações para o vendedor..."
            className={inputClassName}
          />
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="service-active"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <label htmlFor="service-active" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
            Serviço ativo no catálogo (disponível para novas propostas)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save size={16} />} disabled={isSaving}>
            {isSaving ? 'Salvando...' : service ? 'Atualizar Serviço' : 'Salvar Serviço'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
