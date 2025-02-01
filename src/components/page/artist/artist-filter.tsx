// components/artists/ArtistFilter.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

const categories = [
  { value: 'all', label: '전체' },
  { value: 'digital-art', label: '디지털 아트' },
  { value: 'illustration', label: '일러스트레이션' },
  { value: 'video', label: '비디오' },
  { value: 'installation', label: '설치미술' },
];

export function ArtistFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    router.push(`/artists?${params.toString()}`);
  };

  return (
    <Select
      onValueChange={handleFilter}
      defaultValue={searchParams.get('category') ?? 'all'}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="카테고리" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.value} value={category.value}>
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
