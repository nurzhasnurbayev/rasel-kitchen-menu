/**
 * Admin panel strings, in the same typed-dictionary style as $lib/i18n (the guest UI).
 * The admin language follows the same `lang` cookie as the menu's КЗ / РУ switch.
 */
import type { ErrorCode } from '$lib/server/admin/forms';
import type { Lang } from '$lib/i18n';
import type { PurgeResult } from '$lib/server/purge';

const kk = {
	title: 'Мәзірді басқару',
	menu: 'Мәзір',
	openMenu: 'Мәзірді ашу',
	signedInAs: 'Кірген:',
	signOut: 'Шығу',
	devMode: 'Жергілікті режим: Cloudflare Access тексерілмейді',

	section: 'Бөлім',
	sections: 'Бөлімдер',
	addSection: 'Бөлім қосу',
	editSection: 'Бөлімді өзгерту',
	deleteSection: 'Бөлімді өшіру',
	confirmDeleteSection: 'Бұл бөлім өшірілсін бе?',
	sectionNotEmpty:
		'Бөлімде тағамдар бар. Алдымен оларды өшіріңіз немесе басқа бөлімге ауыстырыңыз.',
	hidden: 'Жасырын',
	visibleOnMenu: 'Мәзірде көрсету',
	emptySection: 'Бұл бөлімде әзірге тағам жоқ.',

	dish: 'Тағам',
	addDish: 'Тағам қосу',
	newDish: 'Жаңа тағам',
	editDish: 'Өзгерту',
	deleteDish: 'Тағамды өшіру',
	confirmDeleteDish: 'Бұл тағам біржола өшірілсін бе?',
	available: 'Сатылымда бар',
	soldOut: 'Таусылды',
	/** Short labels for the availability switch in the overview. */
	availableShort: 'Бар',
	soldOutShort: 'Таусылды',
	markSoldOut: 'Таусылды деп белгілеу',
	markAvailable: 'Сатылымға қайтару',
	moveUp: 'Жоғары жылжыту',
	moveDown: 'Төмен жылжыту',

	nameKk: 'Атауы (қазақша)',
	nameRu: 'Атауы (орысша)',
	descriptionKk: 'Сипаттамасы (қазақша)',
	descriptionRu: 'Сипаттамасы (орысша)',
	optional: 'міндетті емес',
	availableHint: 'Белгі алынса, тағам мәзірде «Таусылды» деп көрсетіледі.',

	prices: 'Бағалар мен нұсқалар',
	pricesHint:
		'Бір бағасы бар тағамға атау қажет емес. Өлшемдер немесе таңдау болса (1 л / 0,5 л), әр нұсқаны жеке жолға жазыңыз.',
	labelKk: 'Атауы (қаз.)',
	labelRu: 'Атауы (орыс.)',
	price: 'Бағасы, ₸',
	priceOnRequest: 'Бағасы сұраныс бойынша',
	addVariant: 'Нұсқа қосу',
	removeVariant: 'Нұсқаны өшіру',
	variantNumber: (n: number) => `${n}-нұсқа`,

	photo: 'Фото',
	noPhoto: 'Фото жоқ',
	choosePhoto: 'Фото таңдау',
	uploadPhoto: 'Фотоны жүктеу',
	replacePhoto: 'Фотоны ауыстыру',
	removePhoto: 'Фотоны өшіру',
	confirmRemovePhoto: 'Фото өшірілсін бе?',
	photoHint: 'Фото жүктеу алдында кішірейтіледі.',
	photoAfterSave: 'Фотоны тағамды сақтағаннан кейін қосуға болады.',
	preparingPhoto: 'Фото дайындалуда…',

	save: 'Сақтау',
	create: 'Тағамды қосу',
	cancel: 'Болдырмау',
	back: 'Мәзірге оралу',

	saved: 'Сақталды.',
	deleted: 'Өшірілді.',
	purge: {
		purged: 'Қонақтар өзгерісті бірден көреді.',
		skipped: '',
		'not-configured': 'Мәзір бір минут ішінде жаңарады (кэшті тазалау бапталмаған).',
		failed: 'Кэш тазаланбады: мәзір бір минут ішінде жаңарады.'
	} satisfies Record<PurgeResult, string>,

	fixErrors: 'Белгіленген өрістерді түзетіңіз.',
	notFound: 'Табылмады. Бет жаңартылып көріңіз.',
	errors: {
		required: 'Толтырыңыз',
		tooLong: 'Тым ұзын',
		invalidPrice: 'Бағаны теңгемен, бүтін санмен жазыңыз',
		labelBothLanguages: 'Екі тілде де жазыңыз',
		labelsRequired: 'Нұсқалар бірнешеу болса, әрқайсысына атау беріңіз',
		atLeastOneVariant: 'Кемінде бір баға қосыңыз',
		tooManyVariants: 'Нұсқалар тым көп',
		unknownCategory: 'Бөлімді таңдаңыз'
	} satisfies Record<ErrorCode, string>,
	photoErrors: {
		missing: 'Фото таңдаңыз',
		tooBig: 'Файл тым үлкен (5 МБ-тан аспауы керек)',
		type: 'JPEG, PNG немесе WebP суретін таңдаңыз',
		storage: 'Фото сақталмады. Қайталап көріңіз.'
	}
};

export type AdminDictionary = {
	[K in keyof typeof kk]: (typeof kk)[K] extends string ? string : (typeof kk)[K];
};

const ru: AdminDictionary = {
	title: 'Управление меню',
	menu: 'Меню',
	openMenu: 'Открыть меню',
	signedInAs: 'Вход:',
	signOut: 'Выйти',
	devMode: 'Локальный режим: Cloudflare Access не проверяется',

	section: 'Раздел',
	sections: 'Разделы',
	addSection: 'Добавить раздел',
	editSection: 'Изменить раздел',
	deleteSection: 'Удалить раздел',
	confirmDeleteSection: 'Удалить этот раздел?',
	sectionNotEmpty: 'В разделе есть блюда. Сначала удалите их или перенесите в другой раздел.',
	hidden: 'Скрыт',
	visibleOnMenu: 'Показывать в меню',
	emptySection: 'В этом разделе пока нет блюд.',

	dish: 'Блюдо',
	addDish: 'Добавить блюдо',
	newDish: 'Новое блюдо',
	editDish: 'Изменить',
	deleteDish: 'Удалить блюдо',
	confirmDeleteDish: 'Удалить это блюдо насовсем?',
	available: 'В наличии',
	soldOut: 'Нет в наличии',
	availableShort: 'Есть',
	soldOutShort: 'Нет',
	markSoldOut: 'Отметить «нет в наличии»',
	markAvailable: 'Вернуть в продажу',
	moveUp: 'Переместить выше',
	moveDown: 'Переместить ниже',

	nameKk: 'Название (казахский)',
	nameRu: 'Название (русский)',
	descriptionKk: 'Описание (казахский)',
	descriptionRu: 'Описание (русский)',
	optional: 'необязательно',
	availableHint: 'Если снять отметку, блюдо останется в меню с пометкой «Нет в наличии».',

	prices: 'Цены и варианты',
	pricesHint:
		'Для блюда с одной ценой подпись не нужна. Если есть размеры или выбор (1 л / 0,5 л), укажите каждый вариант отдельной строкой.',
	labelKk: 'Подпись (каз.)',
	labelRu: 'Подпись (рус.)',
	price: 'Цена, ₸',
	priceOnRequest: 'Цена по запросу',
	addVariant: 'Добавить вариант',
	removeVariant: 'Удалить вариант',
	variantNumber: (n: number) => `Вариант ${n}`,

	photo: 'Фото',
	noPhoto: 'Нет фото',
	choosePhoto: 'Выбрать фото',
	uploadPhoto: 'Загрузить фото',
	replacePhoto: 'Заменить фото',
	removePhoto: 'Удалить фото',
	confirmRemovePhoto: 'Удалить фото?',
	photoHint: 'Перед загрузкой фото уменьшается.',
	photoAfterSave: 'Фото можно добавить после сохранения блюда.',
	preparingPhoto: 'Готовим фото…',

	save: 'Сохранить',
	create: 'Добавить блюдо',
	cancel: 'Отмена',
	back: 'Назад к меню',

	saved: 'Сохранено.',
	deleted: 'Удалено.',
	purge: {
		purged: 'Гости сразу увидят изменения.',
		skipped: '',
		'not-configured': 'Меню обновится в течение минуты (очистка кэша не настроена).',
		failed: 'Кэш не очистился: меню обновится в течение минуты.'
	},

	fixErrors: 'Исправьте отмеченные поля.',
	notFound: 'Не найдено. Попробуйте обновить страницу.',
	errors: {
		required: 'Заполните поле',
		tooLong: 'Слишком длинно',
		invalidPrice: 'Укажите цену в тенге целым числом',
		labelBothLanguages: 'Заполните на обоих языках',
		labelsRequired: 'Если вариантов несколько, подпишите каждый',
		atLeastOneVariant: 'Добавьте хотя бы одну цену',
		tooManyVariants: 'Слишком много вариантов',
		unknownCategory: 'Выберите раздел'
	},
	photoErrors: {
		missing: 'Выберите фото',
		tooBig: 'Файл слишком большой (не больше 5 МБ)',
		type: 'Выберите изображение JPEG, PNG или WebP',
		storage: 'Фото не сохранилось. Попробуйте ещё раз.'
	}
};

export const adminUi: Record<Lang, AdminDictionary> = { kk, ru };

export type PhotoError = keyof AdminDictionary['photoErrors'];
