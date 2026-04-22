'use client';

import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type VenueOption = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
};

export type VenueSelectValue = {
  venueId: string | null;
  venueText: string;
  venueAddress: string;
};

interface VenueSelectProps {
  venues: VenueOption[];
  value: VenueSelectValue;
  onChange: (next: VenueSelectValue) => void;
  /** Drop에서는 true(주소 별도 저장), Program에서는 false */
  showAddress?: boolean;
  disabled?: boolean;
}

const CUSTOM = '__custom__';

export function VenueSelect({
  venues,
  value,
  onChange,
  showAddress = false,
  disabled,
}: VenueSelectProps) {
  // 현재 선택 상태 — venueId가 있으면 그걸, 없으면 custom 모드
  const [mode, setMode] = useState<string>(value.venueId ?? CUSTOM);

  const handleSelect = (next: string) => {
    setMode(next);
    if (next === CUSTOM) {
      onChange({
        venueId: null,
        venueText: value.venueText,
        venueAddress: value.venueAddress,
      });
      return;
    }
    const picked = venues.find((v) => v.id === next);
    if (picked) {
      onChange({
        venueId: picked.id,
        venueText: picked.name,
        venueAddress: picked.address ?? '',
      });
    }
  };

  const isCustom = mode === CUSTOM;

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="등록된 장소에서 선택하거나 직접 입력" />
        </SelectTrigger>
        <SelectContent>
          {venues.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <span className="font-medium">{v.name}</span>
                {v.city && (
                  <span className="text-xs text-neutral-500">· {v.city}</span>
                )}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>
            <span className="flex items-center gap-2 text-neutral-600">
              <Plus className="h-3.5 w-3.5" />
              직접 입력 (미등록 장소)
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <div className="space-y-2 rounded-md border border-dashed border-neutral-200 p-3">
          <Input
            value={value.venueText}
            onChange={(e) =>
              onChange({
                venueId: null,
                venueText: e.target.value,
                venueAddress: value.venueAddress,
              })
            }
            placeholder="장소 이름"
          />
          {showAddress && (
            <Input
              value={value.venueAddress}
              onChange={(e) =>
                onChange({
                  venueId: null,
                  venueText: value.venueText,
                  venueAddress: e.target.value,
                })
              }
              placeholder="주소 (선택)"
            />
          )}
          <p className="text-xs text-neutral-500">
            자주 사용하는 장소는{' '}
            <a
              href="/venues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-900"
            >
              장소로 등록
            </a>
            하면 다음부터 목록에서 선택할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
