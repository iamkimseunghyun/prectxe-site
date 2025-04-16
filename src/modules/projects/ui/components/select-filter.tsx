'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterProps {
  years?: number[];
  categories?: { value: string; label: string }[];
  // types?: { value: string; label: string }[];
  pathname: string;
}

const SelectFilter = ({ years, categories, pathname }: FilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedYear = searchParams.get('year') ?? 'all-year';
  const selectedCategory = searchParams.get('category') ?? 'all-category';
  const selectedSort = searchParams.get('sort') ?? 'latest';

  const updateSearchParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === 'all-year' || value === 'all-category') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`/${pathname}?${params.toString()}`);
  };

  const onYearChange = (year: string) => {
    updateSearchParams('year', year === 'all-year' ? null : year);
  };

  const onCategoryChange = (category: string) => {
    updateSearchParams(
      'category',
      category === 'all-category' ? null : category
    );
  };

  const onSortChange = (sort: string) => {
    updateSearchParams('sort', sort);
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 p-4">
        <div className="w-auto flex-shrink-0 sm:w-48">
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="연도 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-year">전체</SelectItem>
              {years?.map((year) => (
                <SelectItem key={`year-${year}`} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categories && (
          <div className="w-auto flex-shrink-0 sm:w-48">
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-category">전체</SelectItem>
                {categories?.map((category) => (
                  <SelectItem
                    key={`category-${category.value}`}
                    value={category.value}
                  >
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="w-auto flex-shrink-0 sm:w-48">
          <Select value={selectedSort} onValueChange={onSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};

export default SelectFilter;
