'use client';

import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type GoodsVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  soldCount: number;
  options: unknown;
  order: number;
};

type DropImage = {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
};

type GoodsDrop = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  heroUrl: string | null;
  status: string;
  images: DropImage[];
  variants: GoodsVariant[];
};

export function GoodsDropDetailView({ drop }: { drop: GoodsDrop }) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const allImages = [
    ...(drop.heroUrl
      ? [{ id: 'hero', imageUrl: drop.heroUrl, alt: drop.title, order: -1 }]
      : []),
    ...drop.images,
  ];

  const selected = drop.variants.find((v) => v.id === selectedVariant);
  const remaining = selected ? selected.stock - selected.soldCount : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Back */}
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <Link
            href="/drops"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Drops
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Image Gallery — 29cm style vertical scroll */}
          <div className="space-y-2">
            {allImages.length > 0 ? (
              allImages.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-lg bg-neutral-50"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.alt}
                    className="w-full object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-lg bg-neutral-100">
                <ShoppingBag className="h-16 w-16 text-neutral-300" />
              </div>
            )}
          </div>

          {/* Product Info — sticky */}
          <div>
            <div className="lg:sticky lg:top-20">
              <div className="space-y-6">
                {/* Title & Price */}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {drop.title}
                  </h1>
                  {drop.summary && (
                    <p className="mt-2 text-neutral-500">{drop.summary}</p>
                  )}
                  {drop.variants.length > 0 && (
                    <p className="mt-3 text-2xl font-bold text-neutral-900">
                      {Math.min(
                        ...drop.variants.map((v) => v.price)
                      ).toLocaleString()}
                      원{drop.variants.length > 1 && '~'}
                    </p>
                  )}
                </div>

                {/* Variant Selection */}
                {drop.status === 'closed' ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-8 text-center">
                    <p className="text-lg font-semibold text-neutral-500">
                      판매 종료
                    </p>
                  </div>
                ) : drop.status === 'sold_out' ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
                    <p className="text-lg font-semibold text-red-600">
                      Sold Out
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="mb-2 text-sm font-medium text-neutral-700">
                        옵션 선택
                      </p>
                      <div className="space-y-2">
                        {drop.variants.map((variant) => {
                          const varRemaining =
                            variant.stock - variant.soldCount;
                          const isSoldOut = varRemaining <= 0;
                          const isSelected = selectedVariant === variant.id;

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              className={`flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                isSoldOut
                                  ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-50'
                                  : isSelected
                                    ? 'border-neutral-900 bg-neutral-50'
                                    : 'border-neutral-200 hover:border-neutral-400'
                              }`}
                              onClick={() => {
                                if (!isSoldOut) {
                                  setSelectedVariant(variant.id);
                                  setQuantity(1);
                                }
                              }}
                              disabled={isSoldOut}
                            >
                              <div>
                                <p className="font-medium text-neutral-900">
                                  {variant.name}
                                </p>
                                {isSoldOut && (
                                  <Badge variant="destructive" className="mt-1">
                                    품절
                                  </Badge>
                                )}
                              </div>
                              <p className="font-semibold text-neutral-900">
                                {variant.price.toLocaleString()}원
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quantity + CTA */}
                    {selected && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-700">
                            수량
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:border-neutral-400 disabled:opacity-30"
                              onClick={() =>
                                setQuantity((q) => Math.max(1, q - 1))
                              }
                              disabled={quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-semibold tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:border-neutral-400 disabled:opacity-30"
                              onClick={() =>
                                setQuantity((q) => Math.min(remaining, q + 1))
                              }
                              disabled={quantity >= remaining}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>총 금액</span>
                          <span>
                            {(selected.price * quantity).toLocaleString()}원
                          </span>
                        </div>

                        <Button
                          className="h-14 w-full rounded-xl text-base font-semibold"
                          size="lg"
                        >
                          <ShoppingBag className="mr-2 h-5 w-5" />
                          구매하기
                        </Button>

                        <p className="text-center text-xs text-neutral-400">
                          잔여 {remaining}개
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Description */}
                {drop.description && (
                  <div className="border-t pt-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                      상세 정보
                    </h3>
                    <div className="prose prose-sm prose-neutral max-w-none">
                      {drop.description.split('\n').map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
