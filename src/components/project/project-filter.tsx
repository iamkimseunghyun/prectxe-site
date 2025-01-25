'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectFilterProps {
  years: number[];
  categories: { value: string; label: string }[];
  onYearChange: (year: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  selectedYear?: string;
  selectedCategory?: string;
  selectedSort?: string;
}

const ProjectFilter = ({
  years,
  categories,
  onYearChange,
  onCategoryChange,
  onSortChange,
  selectedYear,
  selectedCategory,
  selectedSort,
}: ProjectFilterProps) => {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 p-4">
      <div className="w-48">
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="연도 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-year">전체</SelectItem>
            {years.map((year) => (
              <SelectItem key={`year-${year}`} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-48">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-category">전체</SelectItem>
            {categories.map((category) => (
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
      <div className="w-48">
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
  );
};

export default ProjectFilter;
