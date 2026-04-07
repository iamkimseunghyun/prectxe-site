'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import SingleImageBox from '@/components/image/single-image-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSingleImageUpload } from '@/hooks/use-single-image-upload';
import type { SupplierProfileInput } from '@/lib/schemas/estimate';
import { uploadImage } from '@/lib/utils';
import { upsertSupplierProfile } from '@/modules/estimates/server/actions';

interface Props {
  initial: SupplierProfileInput | null;
}

export function SupplierSettingsView({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [businessNo, setBusinessNo] = useState(initial?.businessNo ?? '');
  const [ceo, setCeo] = useState(initial?.ceo ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [validityDays, setValidityDays] = useState(
    initial?.defaultValidityDays ?? 30
  );
  const [watermarkText, setWatermarkText] = useState(
    initial?.watermarkText ?? 'LAAF'
  );
  const [sealUrl, setSealUrl] = useState(initial?.sealUrl ?? '');

  const {
    preview,
    displayUrl,
    imageFile,
    uploadURL,
    error: imageError,
    handleImageChange,
    finalizeUpload,
  } = useSingleImageUpload({
    initialImage: sealUrl,
    onImageUrlChange: (url) => setSealUrl(url),
  });

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      let finalSealUrl = sealUrl;
      if (imageFile) {
        const ok = await uploadImage(imageFile, uploadURL);
        if (!ok) {
          setError('인감 이미지 업로드 실패');
          return;
        }
        finalizeUpload();
        finalSealUrl = sealUrl;
      }

      const res = await upsertSupplierProfile({
        companyName,
        businessNo: businessNo || null,
        ceo: ceo || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        sealUrl: finalSealUrl || null,
        defaultValidityDays: Number(validityDays) || 30,
        watermarkText: watermarkText || null,
      });
      if (!res.success) {
        setError(res.error ?? '저장 실패');
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/estimates"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← 견적서 목록
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">공급자 설정</h1>
        <p className="text-sm text-muted-foreground">
          견적서 발행 시 자동으로 채워집니다. 인감/워터마크도 여기서 관리해요.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장되었습니다.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="회사명 *" required>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label="사업자등록번호">
              <Input
                value={businessNo}
                onChange={(e) => setBusinessNo(e.target.value)}
                placeholder="123-45-67890"
              />
            </Field>
            <Field label="대표자">
              <Input value={ceo} onChange={(e) => setCeo(e.target.value)} />
            </Field>
            <Field label="대표 전화">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02-1234-5678"
              />
            </Field>
            <Field label="이메일">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="기본 유효기간 (일)">
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="주소">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="담당자 이름">
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </Field>
            <Field label="담당자 연락처">
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="010-1234-5678"
              />
            </Field>
          </div>
          <Field label="견적서 워터마크 텍스트">
            <Input
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="예: LAAF, DRAFT"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              견적서 인쇄 미리보기 화면에 회전되어 크게 표시되는 텍스트입니다.
              인쇄/PDF 저장 시 자동으로 사라집니다. 비워두면 LAAF가 표시됩니다.
            </p>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <Label>인감 (선택)</Label>
            <p className="text-xs text-muted-foreground">
              투명 배경 PNG 권장. 견적서 우측 하단에 표시됩니다.
            </p>
          </div>
          <div className="max-w-[200px]">
            <SingleImageBox
              register={{ name: 'sealUrl', onBlur: () => {}, ref: () => {} }}
              preview={preview}
              displayUrl={displayUrl}
              error={imageError}
              handleImageChange={handleImageChange}
              aspectRatio="square"
              inputId="sealUrl"
              placeholder="인감 추가"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </Label>
      {children}
    </div>
  );
}
