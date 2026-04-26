import { AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface LabelInfo {
  label: string;
  variant: BadgeVariant;
}

const DROP_STATUS_LABELS: Record<string, LabelInfo> = {
  draft: { label: '초안', variant: 'secondary' },
  upcoming: { label: '예정', variant: 'outline' },
  on_sale: { label: '판매 중', variant: 'default' },
  sold_out: { label: '매진', variant: 'destructive' },
  closed: { label: '종료', variant: 'outline' },
};

const ORDER_STATUS_LABELS: Record<string, LabelInfo> = {
  pending: { label: '대기', variant: 'secondary' },
  paid: { label: '결제완료', variant: 'default' },
  confirmed: { label: '확정', variant: 'default' },
  cancelled: { label: '취소', variant: 'destructive' },
  refunded: { label: '환불', variant: 'outline' },
};

export function DropStatusBadge({ status }: { status: string }) {
  const info = DROP_STATUS_LABELS[status] ?? DROP_STATUS_LABELS.draft;
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

interface OrderStatusBadgeProps {
  status: string;
  bankTransferStatus?: string | null;
}

export function OrderStatusBadge({
  status,
  bankTransferStatus,
}: OrderStatusBadgeProps) {
  // 입금대기 상태가 우선 — Order.status='pending' + BankTransfer.status='pending'
  if (status === 'pending' && bankTransferStatus === 'pending') {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-700"
      >
        입금대기
      </Badge>
    );
  }
  const info = ORDER_STATUS_LABELS[status] ?? ORDER_STATUS_LABELS.pending;
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

interface RemainingTimeIndicatorProps {
  expiresAt: Date | string;
}

export function RemainingTimeIndicator({
  expiresAt,
}: RemainingTimeIndicatorProps) {
  const target =
    typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const diffMs = target.getTime() - Date.now();
  const expired = diffMs <= 0;
  const totalMin = Math.max(0, Math.floor(diffMs / 60_000));
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const text = expired
    ? '만료됨'
    : hours > 0
      ? `${hours}시간 ${mins}분 남음`
      : `${mins}분 남음`;
  const urgent = expired || totalMin <= 360; // 6시간 이내

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        urgent ? 'text-red-600' : 'text-muted-foreground'
      }`}
    >
      {urgent ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {text}
    </span>
  );
}
