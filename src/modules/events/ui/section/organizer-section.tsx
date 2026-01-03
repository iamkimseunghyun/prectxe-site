import { Plus, Trash2 } from 'lucide-react';
import { type Control, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Event } from '@/lib/schemas';
import { CreateArtistModal } from '@/modules/events/ui/components/create-artist-modal';

interface OrganizersSectionProps {
  control: Control<Event>;
  artists: {
    id: string;
    name: string;
    nameKr?: string | null;
  }[];
  userId: string;
}

const OrganizersSection = ({
  control,
  artists,
  userId,
}: OrganizersSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'organizers',
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">주최자</h3>
            <div className="flex gap-2">
              {/* 새 아티스트 생성 모달 */}
              <CreateArtistModal
                onSuccess={(artist) => {
                  // 새로운 아티스트를 선택 목록에 추가
                  append({ artistId: artist.id, role: '' });
                }}
                userId={userId}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ artistId: '', role: '' })}
            >
              <Plus className="mr-2 h-4 w-4" />
              주최자 추가
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>아티스트</TableHead>
                <TableHead>역할</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`organizers.${index}.artistId`}
                      render={({ field: artistField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">
                            아티스트 선택
                          </FormLabel>
                          <Select
                            onValueChange={artistField.onChange}
                            value={artistField.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="아티스트 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {artists.map((artist) => (
                                <SelectItem key={artist.id} value={artist.id}>
                                  {formatArtistName(
                                    artist.nameKr as any,
                                    artist.name
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`organizers.${index}.role`}
                      render={({ field: roleField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">역할</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="역할을 입력하세요 (예: 큐레이터)"
                              {...roleField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    주최자가 없습니다. 주최자를 추가해주세요.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
export default OrganizersSection;

import { formatArtistName } from '@/lib/utils';
