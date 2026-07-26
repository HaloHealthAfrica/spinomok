-- Momanyi expense import for PostgreSQL
-- Generated from docs/accounting/Momanyi-categorized.xlsx
-- Safe to rerun: existing matching expenses are skipped.

BEGIN;

DO $$
DECLARE
    farm_count integer;
BEGIN
    SELECT COUNT(*)
      INTO farm_count
      FROM farms
     WHERE name = 'SpinoMok Dairy Farm'
       AND deleted_at IS NULL;

    IF farm_count <> 1 THEN
        RAISE EXCEPTION
            'Expected exactly one active farm named SpinoMok Dairy Farm; found %',
            farm_count;
    END IF;
END
$$;

WITH target_farm AS (
    SELECT id
      FROM farms
     WHERE name = 'SpinoMok Dairy Farm'
       AND deleted_at IS NULL
),
source_expenses (id, expense_date, category, description, amount) AS (
    VALUES
        ('a32e1fe9-7133-4e24-868a-80859e3d0a41'::uuid, '2026-01-06'::date, 'feed', 'HIYIELDERPHOS STOCKLICK 5KG', 2400.00::numeric),
        ('fa3ba483-f640-437e-94c4-ef8595dd59f1'::uuid, '2026-01-06'::date, 'feed', 'MACLIK DRY 2KG', 550.00::numeric),
        ('02fc2c35-621d-4c65-82f5-6ed0c54b23a3'::uuid, '2026-01-06'::date, 'other', 'KUNGUNILL 10 ML', 750.00::numeric),
        ('a69dfb55-ef16-49da-8342-dd3eadc927ff'::uuid, '2026-01-06'::date, 'transport', 'TRANSPORT', 100.00::numeric),
        ('c5553322-c6a7-4930-b1a8-55acdc09b35b'::uuid, '2026-01-06'::date, 'other', 'TREVIN 200G', 600.00::numeric),
        ('75925bee-0a69-4105-b616-7518d3edf7ce'::uuid, '2026-01-06'::date, 'feed', 'HIYIELDERPHOS MAZIWA 5KG', 2600.00::numeric),
        ('77a96f9c-c29d-48be-a21f-be8be95c5a79'::uuid, '2026-06-06'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 17400.00::numeric),
        ('e8ec5bc6-853a-4762-acde-b312cc7feaf1'::uuid, '2026-06-06'::date, 'feed', 'KUPAKULA 20 KG', 16500.00::numeric),
        ('3aa7a487-6fc0-4864-a6a7-60a237c414f2'::uuid, '2026-06-06'::date, 'feed', 'MACKLICK SUPER 20KG', 5050.00::numeric),
        ('778ae906-6492-4171-ac50-6f370d7b54f1'::uuid, '2026-06-06'::date, 'transport', 'TRANSPORT', 300.00::numeric),
        ('bc8420bc-020d-4e04-ad27-b527f2e132e1'::uuid, '2026-06-10'::date, 'feed', 'MACLIK DRY 6KG', 1550.00::numeric),
        ('e54754ec-8d3b-4e5b-90a7-34bcf7ebbe5a'::uuid, '2026-06-12'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 17400.00::numeric),
        ('60c4fa23-2ef9-4ca8-abfc-b82a03d75258'::uuid, '2026-06-12'::date, 'feed', 'KUPAKULA GOLD 20KG', 5500.00::numeric),
        ('d669b33a-6e47-47a3-a5f9-6a351f413f0e'::uuid, '2026-06-12'::date, 'feed', 'MAZIWA MOO 20KG', 1700.00::numeric),
        ('d68c2048-c69e-4fef-b9cf-75af4ef9210e'::uuid, '2026-06-12'::date, 'transport', 'TRANSPORT', 400.00::numeric),
        ('751467ad-0563-4250-975a-4541ca2d081b'::uuid, '2026-06-15'::date, 'feed', 'FUGO DAIRY MEAN 50KG', 5800.00::numeric),
        ('77a2023b-df74-4485-94c8-b1c5d7f29166'::uuid, '2026-06-15'::date, 'transport', 'TRANSPORT', 100.00::numeric),
        ('feed3ad1-010b-4d4f-9a0d-78fe4ab1b506'::uuid, '2026-06-16'::date, 'feed', 'CHICK MASH 1KG', 300.00::numeric),
        ('913b95d4-c570-41d6-b8c7-7133bfef4483'::uuid, '2026-06-16'::date, 'other', 'EGOCIN CHICK', 100.00::numeric),
        ('e5e8ed88-05a8-434a-950d-65e17f2f6802'::uuid, '2026-06-18'::date, 'feed', 'DRY BLOCKS 5KG', 3000.00::numeric),
        ('30ad7cc0-c323-4104-9c86-0a7af8ae8f34'::uuid, '2026-06-18'::date, 'feed', 'MINERAL BLOCKS 5KG', 3600.00::numeric),
        ('de99d26e-c9f8-49af-87f2-bd968c65ff31'::uuid, '2026-06-18'::date, 'feed', 'AFYA BORA DRY COW 2KG', 1500.00::numeric),
        ('95849655-a7a6-46d8-802e-dab7c73ac999'::uuid, '2026-06-18'::date, 'vet', 'MULTICURE 1 LITRE', 5000.00::numeric),
        ('314fc33a-dc50-4b65-a0e1-c6c87b5d1e00'::uuid, '2026-06-18'::date, 'transport', 'TRANSPORT', 150.00::numeric),
        ('863f612f-6311-4bd2-bb5a-b3b437ea7031'::uuid, '2026-06-20'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 17400.00::numeric),
        ('c497a6fe-8d60-49c0-a3fc-45ec175bcf0d'::uuid, '2026-06-20'::date, 'feed', 'KUPAKULA GOLD 20KG', 5500.00::numeric),
        ('1f69c6bc-b8da-4edd-8b69-c9ab4f0513ec'::uuid, '2026-06-20'::date, 'feed', 'TRUVETS 20 KG', 1700.00::numeric),
        ('4b1e812c-15a5-4ded-958a-6dde6fa33187'::uuid, '2026-06-20'::date, 'transport', 'TRANSPORT', 400.00::numeric),
        ('51ef796b-a179-4799-881a-7bfea315ea88'::uuid, '2026-06-23'::date, 'feed', 'MACLIK DRY 2KG', 550.00::numeric),
        ('3c3f7c23-fee2-4bac-9b93-f4eb24d3718e'::uuid, '2026-06-23'::date, 'feed', 'FUGO DAIRY MEAL 50 KG', 2900.00::numeric),
        ('92cac25d-942c-4bf1-ac5d-ba40613f34be'::uuid, '2026-06-25'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 17400.00::numeric),
        ('1899e15f-b621-4131-b431-b8c744767836'::uuid, '2026-06-25'::date, 'feed', 'MACLIK SUPER 20KG', 5200.00::numeric),
        ('1ba4b935-f13d-45c7-90ec-12d0ae000153'::uuid, '2026-06-25'::date, 'feed', 'KUPAKULA GOLD 20KG', 11000.00::numeric),
        ('16cc8ea8-6b45-4ba0-9139-1c615285816b'::uuid, '2026-06-25'::date, 'transport', 'TRANSPORT', 400.00::numeric),
        ('4ead3f41-82e7-42ba-b205-418de980672f'::uuid, '2026-06-27'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 5800.00::numeric),
        ('f120f789-6b3c-4ffc-a1e1-a18f5ae4b44a'::uuid, '2026-06-27'::date, 'transport', 'TRANSPORT', 100.00::numeric),
        ('346dd680-aaa7-43a0-bc05-2b750b31abc7'::uuid, '2026-07-01'::date, 'vet', 'NILZAN PLUS 1LITRE', 1800.00::numeric),
        ('457a412c-2180-4313-8f3a-33704c8bdc6c'::uuid, '2026-07-01'::date, 'vet', 'SUPERMEC 100 ML', 600.00::numeric),
        ('da58b637-b154-4299-bad5-5042a7c0de25'::uuid, '2026-07-01'::date, 'transport', 'TRANSPORT', 100.00::numeric),
        ('70328cd0-dbec-43fd-bafe-cacc3230f7d3'::uuid, '2026-07-03'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 17400.00::numeric),
        ('a846cd83-c1f3-40f9-bb43-b0533446609b'::uuid, '2026-07-03'::date, 'transport', 'TRANSPORT', 300.00::numeric),
        ('86bc114a-2d04-4fe1-b9ee-2059c5542224'::uuid, '2026-07-04'::date, 'vet', 'PENECILLIIN 100ML', 450.00::numeric),
        ('f5631a52-2b6e-466c-872c-83b35bafc078'::uuid, '2026-07-04'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 5800.00::numeric),
        ('582fea27-1c23-4ff4-acca-ee408b48d581'::uuid, '2026-07-07'::date, 'feed', 'CALF PENCILS 50KG', 9000.00::numeric),
        ('f83073f1-cf4f-4e0f-9cf5-438a9a6a76f7'::uuid, '2026-07-07'::date, 'feed', 'DAIRY MEAL FUGO 50 KG', 8700.00::numeric),
        ('d1cfed87-b7e8-4a07-8325-57900ad4ef81'::uuid, '2026-07-07'::date, 'transport', 'TRANSPORT', 200.00::numeric),
        ('03574f5b-0c61-4340-93d6-67d481e49c70'::uuid, '2026-07-11'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 20300.00::numeric),
        ('48f50e56-9f93-4170-ad15-7aa7eb2cc452'::uuid, '2026-07-11'::date, 'other', 'STELADONE 250 ML', 1350.00::numeric),
        ('f6dad9f2-ad49-44e6-b334-88333675c142'::uuid, '2026-07-11'::date, 'other', 'RIDOMIL 40G', 500.00::numeric),
        ('5a4ff5a9-d4fa-4120-9543-695bfeaac326'::uuid, '2026-07-11'::date, 'feed', 'AFYABORA STOCKLICK 20KG', 1350.00::numeric),
        ('5ab2d0d3-50da-4bd5-9dd3-a1b5bad49360'::uuid, '2026-07-11'::date, 'feed', 'BESTPHOS MAZIWA 2OKG', 1600.00::numeric),
        ('00a92715-8bf4-49eb-b89a-f652080f9579'::uuid, '2026-07-11'::date, 'other', 'MULTI NPK 250G', 300.00::numeric),
        ('0021e08f-df8a-4fcb-813d-19eb48c61676'::uuid, '2026-07-11'::date, 'transport', 'TRANSPORT', 500.00::numeric),
        ('bd63a38d-8ddd-4c3a-a964-938358c0472a'::uuid, '2026-07-18'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 20300.00::numeric),
        ('1dde36d8-7759-46c2-9d96-ec329b1afb06'::uuid, '2026-07-18'::date, 'feed', 'TRUVET 20 KG', 1750.00::numeric),
        ('c88cfb3c-f3fc-425d-8c07-86490abfd0c7'::uuid, '2026-07-18'::date, 'transport', 'TRANSPORT', 400.00::numeric),
        ('12048282-faa4-42f2-a464-b386e72c2f89'::uuid, '2026-07-25'::date, 'feed', 'FUGO DAIRY MEAL 50KG', 20300.00::numeric),
        ('d0827393-7a06-4226-b472-fb7c47d68629'::uuid, '2026-07-25'::date, 'feed', 'MACLIK SUPER 20KG', 5300.00::numeric),
        ('612edbcc-fef4-48f2-b781-9d58eaf51b60'::uuid, '2026-07-25'::date, 'feed', 'DRY BLOCK 2KG', 1800.00::numeric),
        ('fa7fffb9-79f7-42c2-a734-7a85538db96e'::uuid, '2026-07-25'::date, 'transport', 'TRANSPORT', 400.00::numeric)
)
INSERT INTO expenses (
    id,
    farm_id,
    category,
    expense_date,
    description,
    amount,
    currency,
    is_recurring,
    is_paid,
    notes,
    created_at,
    updated_at
)
SELECT
    source.id,
    farm.id,
    source.category,
    source.expense_date,
    source.description,
    source.amount,
    'KES',
    FALSE,
    TRUE,
    'Imported from Momanyi.xlsx',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM source_expenses AS source
CROSS JOIN target_farm AS farm
WHERE NOT EXISTS (
    SELECT 1
      FROM expenses AS existing
     WHERE existing.farm_id = farm.id
       AND existing.expense_date = source.expense_date
       AND existing.category = source.category
       AND existing.description = source.description
       AND existing.amount = source.amount
       AND existing.deleted_at IS NULL
);

COMMIT;
