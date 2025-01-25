'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const SearchCommand = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // 검색어 입력 시 실행되는 함수
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // 검색 페이지로 이동
    if (value) {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        type="text"
        placeholder="전체 검색..."
        className="pl-10"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
};

export default SearchCommand;
