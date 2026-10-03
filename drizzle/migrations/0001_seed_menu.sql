-- Seed: the opening menu.
--
-- This is a migration on purpose, so each database (local or production) gets it exactly once:
-- wrangler records applied migrations in the d1_migrations table, so running
-- `npm run db:migrate:remote` again later can never overwrite edits made in the admin panel.
--
-- IDs are explicit so the variants below can reference their items.
-- Prices are whole tenge; NULL price = "price on request".

INSERT INTO categories (id, name_kk, name_ru, sort_order) VALUES
	(1, 'Бірінші тағамдар', 'Первые блюда', 1),
	(2, 'Екінші тағамдар', 'Вторые блюда', 2),
	(3, 'Гарнирлер', 'Гарниры', 3),
	(4, 'Сусындар', 'Напитки', 4),
	(5, 'Соустар', 'Соусы', 5),
	(6, 'Салаттар', 'Салаты', 6);
--> statement-breakpoint

INSERT INTO items (id, category_id, name_kk, name_ru, description_kk, description_ru, sort_order) VALUES
	-- 1. Бірінші тағамдар / Первые блюда
	(1, 1, 'Сорпа (сиыр етімен)', 'Сорпа (с говядиной)', NULL, NULL, 1),
	(2, 1, 'Борщ', 'Борщ', NULL, NULL, 2),
	(3, 1, 'Солянка', 'Солянка', NULL, NULL, 3),
	(4, 1, 'Пельмен (сиыр етімен)', 'Пельмени (с говядиной)', NULL, NULL, 4),
	(5, 1, 'Нарын (жылқы етімен)', 'Нарын (с кониной)', NULL, NULL, 5),
	(6, 1, 'Кеспе (сиыр етімен)', 'Кеспе (с говядиной)', NULL, NULL, 6),
	(7, 1, 'Әсіп сорпа', 'Сорпа с асыпом', NULL, NULL, 7),
	-- 2. Екінші тағамдар / Вторые блюда
	(8, 2, 'Қуырдақ (жылқы етімен)', 'Куырдак (из конины)', NULL, NULL, 1),
	(9, 2, 'Бешбармақ (жылқы етімен)', 'Бешбармак (с кониной)', NULL, NULL, 2),
	(10, 2, 'Лағман (гуйру)', 'Лагман гуйру', NULL, NULL, 3),
	(11, 2, 'Лағман (суйру)', 'Лагман суйру', NULL, NULL, 4),
	(12, 2, 'Қуырылған лағман', 'Лагман жареный', NULL, NULL, 5),
	(13, 2, 'Етті манты', 'Манты с мясом', NULL, NULL, 6),
	(14, 2, 'Асқабақты манты', 'Манты с тыквой', NULL, NULL, 7),
	(15, 2, 'Орама', 'Орама', NULL, NULL, 8),
	(16, 2, 'Палау', 'Плов', NULL, NULL, 9),
	(17, 2, 'Тайша ет', 'Мясо по-тайски', 'Гарнир: күріш немесе пюре', 'Гарнир на выбор: рис или пюре', 10),
	(18, 2, 'Котлет', 'Котлета', 'Гарнир: күріш немесе пюре', 'Гарнир на выбор: рис или пюре', 11),
	(19, 2, 'Көкөніс қосылған тауық', 'Курица с овощами', NULL, NULL, 12),
	-- 3. Гарнирлер / Гарниры
	(20, 3, 'Наггетс', 'Наггетсы', NULL, NULL, 1),
	(21, 3, 'Фри', 'Картофель фри', NULL, NULL, 2),
	(22, 3, 'Күріш / пюре', 'Рис / пюре', NULL, NULL, 3),
	-- 4. Сусындар / Напитки
	(23, 4, 'Компот', 'Компот', NULL, NULL, 1),
	(24, 4, 'Каркаде', 'Каркаде', NULL, NULL, 2),
	(25, 4, 'Кола, Фанта, Спрайт', 'Кола, Фанта, Спрайт', NULL, NULL, 3),
	(26, 4, 'Шырындар', 'Соки', NULL, NULL, 4),
	(27, 4, 'Киви лимонады', 'Киви лимонад', NULL, NULL, 5),
	(28, 4, 'Жидек лимонады', 'Ягодный лимонад', NULL, NULL, 6),
	(29, 4, 'Мохито лимонады', 'Лимонад Мохито', NULL, NULL, 7),
	(30, 4, 'Манго-маракуйя лимонады', 'Лимонад манго-маракуйя', NULL, NULL, 8),
	-- 5. Соустар / Соусы
	(31, 5, 'Шашлық соусы', 'Шашлычный соус', NULL, NULL, 1),
	(32, 5, 'Қаймақ', 'Сметана', NULL, NULL, 2),
	(33, 5, 'Кетчуп', 'Кетчуп', NULL, NULL, 3),
	-- 6. Салаттар / Салаты
	(34, 6, 'Бөшке қырыққабаты', 'Бочковая капуста', NULL, NULL, 1),
	(35, 6, 'Тұздалған қияр', 'Солёные огурцы', NULL, NULL, 2),
	(36, 6, 'Тұздалған ассорти (шырынымен)', 'Ассорти соленья в рассоле', NULL, NULL, 3),
	(37, 6, 'Кимчи', 'Кимчи', NULL, NULL, 4);
--> statement-breakpoint

-- Single-price items: one variant without a label.
INSERT INTO variants (item_id, label_kk, label_ru, price, sort_order) VALUES
	(1, NULL, NULL, 2000, 1),
	(2, NULL, NULL, 1800, 1),
	(3, NULL, NULL, 2000, 1),
	(4, NULL, NULL, 2000, 1),
	(5, NULL, NULL, 2000, 1),
	(6, NULL, NULL, 1800, 1),
	(7, NULL, NULL, 2000, 1),
	(8, NULL, NULL, 3500, 1),
	(9, NULL, NULL, 3500, 1),
	(10, NULL, NULL, 2000, 1),
	(11, NULL, NULL, 2000, 1),
	(12, NULL, NULL, 2000, 1),
	(13, NULL, NULL, 1700, 1),
	(14, NULL, NULL, 1700, 1),
	(15, NULL, NULL, 2000, 1),
	(16, NULL, NULL, 2000, 1),
	(17, NULL, NULL, 2500, 1),
	(18, NULL, NULL, 2000, 1),
	(19, NULL, NULL, 2800, 1),
	(20, NULL, NULL, 1500, 1),
	(21, NULL, NULL, 800, 1),
	(31, NULL, NULL, 200, 1),
	(32, NULL, NULL, 180, 1),
	(33, NULL, NULL, 180, 1),
	(34, NULL, NULL, 600, 1),
	(35, NULL, NULL, 800, 1),
	(36, NULL, NULL, NULL, 1),
	(37, NULL, NULL, NULL, 1);
--> statement-breakpoint

-- Items with labelled variants (sizes or choices), shown as one card each.
INSERT INTO variants (item_id, label_kk, label_ru, price, sort_order) VALUES
	(22, 'Күріш', 'Рис', 500, 1),
	(22, 'Пюре', 'Пюре', 500, 2),
	(23, '1 л', '1 л', 900, 1),
	(23, '0,5 л', '0,5 л', 450, 2),
	(24, '1 л', '1 л', 900, 1),
	(24, '0,5 л', '0,5 л', 450, 2),
	(25, '1 л', '1 л', 890, 1),
	(26, '1 л', '1 л', 1190, 1),
	(27, '1 л', '1 л', 1990, 1),
	(28, '1 л', '1 л', 1990, 1),
	(29, '1 л', '1 л', 1990, 1),
	(30, '1 л', '1 л', 1990, 1);
