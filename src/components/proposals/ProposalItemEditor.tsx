import React, { useState } from 'react';
import { ProposalItem, ServiceItem } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { calculateItemTotal } from '../../utils/calculations';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';

interface ProposalItemEditorProps {
  items: ProposalItem[];
  onChange: (items: ProposalItem[]) => void;
  availableServices: ServiceItem[];
}

export function ProposalItemEditor({
  items,
  onChange,
  availableServices
}: ProposalItemEditorProps) {
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const handleAddFromCatalog = () => {
    if (!selectedServiceId) return;
    const service = availableServices.find(s => s.id === selectedServiceId);
    if (!service) return;

    const newItem: ProposalItem = {
      id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      serviceId: service.id,
      orderIndex: items.length + 1,
      serviceName: service.name,
      description: service.defaultDescription,
      unit: service.unit,
      unitPrice: service.unitPrice,
      quantity: 1,
      discount: 0,
      total: service.unitPrice
    };

    onChange([...items, newItem]);
    setSelectedServiceId('');
  };

  const handleAddCustomItem = () => {
    const newItem: ProposalItem = {
      id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      orderIndex: items.length + 1,
      serviceName: 'Novo Serviço Customizado',
      description: 'Especificação técnica do serviço customizado...',
      unit: 'serviço',
      unitPrice: 0,
      quantity: 1,
      discount: 0,
      total: 0
    };

    onChange([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof ProposalItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Recalculate total for item
    current.total = calculateItemTotal(current.quantity, current.unitPrice, current.discount);
    updated[index] = current;
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      orderIndex: idx + 1
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === items.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Fix order indices
    const reordered = updated.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Top action bar to add services */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Selecione um serviço do catálogo oficial...</option>
            {availableServices
              .filter(s => s.isActive)
              .map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.unit}) — {formatCurrency(s.unitPrice)}
                </option>
              ))}
          </select>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddFromCatalog}
            disabled={!selectedServiceId}
            leftIcon={<Plus size={15} />}
          >
            Adicionar Item
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddCustomItem}
          leftIcon={<Sparkles size={14} />}
        >
          Item Personalizado
        </Button>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white/50">
          <p className="text-sm font-semibold text-slate-500">
            Nenhum serviço adicionado ainda. Escolha no catálogo acima ou crie um item personalizado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs transition hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.serviceName}
                    onChange={e => handleUpdateItem(index, 'serviceName', e.target.value)}
                    placeholder="Nome do serviço"
                    className="flex-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none px-1 py-0.5"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Mover para cima"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === items.length - 1}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Mover para baixo"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer ml-1"
                    title="Remover este item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={e => handleUpdateItem(index, 'description', e.target.value)}
                  placeholder="Descrição / Escopo específico deste item na proposta..."
                  className="w-full text-xs text-slate-600 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Numbers row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.quantity}
                    onChange={e => handleUpdateItem(index, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 text-center outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => handleUpdateItem(index, 'unit', e.target.value)}
                    placeholder="diária..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 text-center outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Valor Unit. (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => handleUpdateItem(index, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 text-right outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount}
                    onChange={e => handleUpdateItem(index, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 text-right outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Total do Item
                  </span>
                  <div className="font-mono text-sm font-extrabold text-slate-900 py-1.5">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
