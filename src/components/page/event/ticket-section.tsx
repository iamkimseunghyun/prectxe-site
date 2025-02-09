import { Control, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { EventFormType } from '@/app/events/event';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TicketsSectionProps {
  control: Control<EventFormType>;
}

const TicketsSection = ({ control }: TicketsSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tickets',
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">티켓</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', price: 0, quantity: 1 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              티켓 추가
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>티켓명</TableHead>
                <TableHead>가격</TableHead>
                <TableHead>수량</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`tickets.${index}.name`}
                      render={({ field: nameField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">티켓명</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="티켓명을 입력하세요"
                              {...nameField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`tickets.${index}.price`}
                      render={({ field: priceField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">가격</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="0"
                                min={0}
                                className="pl-7"
                                {...priceField}
                                onChange={(e) =>
                                  priceField.onChange(
                                    e.target.value ? Number(e.target.value) : 0
                                  )
                                }
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ₩
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`tickets.${index}.quantity`}
                      render={({ field: quantityField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">수량</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1"
                              min={1}
                              {...quantityField}
                              onChange={(e) =>
                                quantityField.onChange(
                                  e.target.value ? Number(e.target.value) : 1
                                )
                              }
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
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    등록된 티켓이 없습니다. 티켓을 추가해주세요.
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
export default TicketsSection;
