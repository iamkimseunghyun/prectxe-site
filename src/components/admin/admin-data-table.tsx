'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteButton, type AdminResource } from './delete-button';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  editHref: (item: T) => string;
  deleteResource: AdminResource;
  emptyMessage?: string;
}

export function AdminDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  getRowKey,
  editHref,
  deleteResource,
  emptyMessage = '데이터가 없습니다.',
}: AdminDataTableProps<T>) {
  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.className}
                >
                  {col.header}
                </TableHead>
              ))}
              <TableHead style={{ width: '8rem' }}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={getRowKey(item)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(item)
                        : ((getValue(item, col.key) as React.ReactNode) ?? '-')}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={editHref(item)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        편집
                      </Link>
                      <DeleteButton
                        resource={deleteResource}
                        id={getRowKey(item)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
