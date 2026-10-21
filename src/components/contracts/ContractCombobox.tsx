'use client';

import React from 'react';
import { useContracts } from '@/src/hooks/useContracts';
import type { PerhutaniContract } from '@/src/types/index';

export interface ContractComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectContract?: (contract: PerhutaniContract) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ContractCombobox({
  value,
  onChange,
  onSelectContract,
  placeholder = 'CTR-01 / PO-...',
  disabled = false,
}: ContractComboboxProps) {
  const { contracts } = useContracts();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const matchingContract = contracts.find(
      (c) => c.contractNumber.toLowerCase() === val.trim().toLowerCase()
    );
    if (matchingContract && onSelectContract) {
      onSelectContract(matchingContract);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        list="perhutani-contracts-datalist"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono"
      />
      <datalist id="perhutani-contracts-datalist">
        {contracts.map((c) => (
          <option
            key={c.id}
            value={c.contractNumber}
          >
            {c.kphOrigin} ({c.status})
          </option>
        ))}
      </datalist>
    </div>
  );
}
