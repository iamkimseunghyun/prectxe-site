-- 현재 Form 데이터 확인
SELECT
  f.id,
  f.slug,
  f.title,
  f."updatedAt",
  COUNT(DISTINCT fs.id) as submission_count,
  COUNT(DISTINCT ff.id) as field_count
FROM "Form" f
LEFT JOIN "FormSubmission" fs ON f.id = fs."formId"
LEFT JOIN "FormField" ff ON f.id = ff."formId"
WHERE f.slug = 'max-cooper-insight-session'
GROUP BY f.id, f.slug, f.title, f."updatedAt";

-- FormSubmission 확인
SELECT
  id,
  "formId",
  "submittedAt"
FROM "FormSubmission"
WHERE "formId" IN (
  SELECT id FROM "Form" WHERE slug = 'max-cooper-insight-session'
)
ORDER BY "submittedAt" DESC
LIMIT 5;

-- FormResponse 확인 (fieldId가 NULL인지 확인)
SELECT
  fr.id,
  fr."fieldId",
  fr."fieldLabel",
  fr."fieldType",
  fr.value,
  fs."submittedAt"
FROM "FormResponse" fr
JOIN "FormSubmission" fs ON fr."submissionId" = fs.id
WHERE fs."formId" IN (
  SELECT id FROM "Form" WHERE slug = 'max-cooper-insight-session'
)
ORDER BY fs."submittedAt" DESC
LIMIT 10;
