/**
 * Languages and UI strings. Menu content (dish names etc.) lives in the database;
 * this file only holds the interface text around it.
 */

export const LANGS = ['kk', 'ru'] as const;
export type Lang = (typeof LANGS)[number];

/** Kazakh is the default when nothing else tells us what the guest prefers. */
export const DEFAULT_LANG: Lang = 'kk';

/** Cookie that remembers the guest's explicit language choice. */
export const LANG_COOKIE = 'lang';

export function isLang(value: unknown): value is Lang {
	return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

const kk = {
	/** Short label in the КЗ / РУ switcher. */
	langShort: 'КЗ',
	/** Full language name, used for accessible labels and the footer. */
	langName: 'Қазақша',
	/** Value for the og:locale meta tag. */
	locale: 'kk_KZ',
	languageSwitcher: 'Тілді таңдау',
	skipToMenu: 'Мәзірге өту',
	menu: 'Мәзір',
	menuSections: 'Мәзір бөлімдері',
	menuEmpty: 'Мәзір жақында жаңартылады',
	metaDescription: (cafe: string) => `${cafe} мәзірі мен бағалары`,
	address: 'Мекенжай',
	hours: 'Жұмыс уақыты',
	call: 'Қоңырау шалу',
	openIn2gis: '2GIS-те ашу',
	priceOnRequest: 'Бағасын сұраңыз',
	soldOut: 'Таусылды',
	notFound: 'Бет табылмады',
	somethingWentWrong: 'Қате орын алды',
	backToMenu: 'Мәзірге оралу',

	// Guest basket (enhancement; only shown with JavaScript)
	basket: 'Себет',
	openBasket: 'Себетті ашу',
	addToBasket: 'Себетке қосу',
	removeOne: 'Біреуін алып тастау',
	inBasket: 'Себетте',
	basketEmpty: 'Себет бос',
	total: 'Барлығы',
	priceOnRequestNote: 'Бағасы сұралатын тағамдар жалпы сомаға кірмеген',
	soldOutNote: 'Таусылған тағамдар тапсырысқа кірмейді',
	/** Wording to be checked by a native speaker. */
	showToWaiter: 'Даяшыға көрсету',
	clearBasket: 'Себетті тазалау',
	confirmClear: 'Себеттегінің бәрін өшіру керек пе?',
	close: 'Жабу',
	order: 'Тапсырыс',
	showThisScreen: 'Осы экранды даяшыға көрсетіңіз',
	editOrder: 'Өзгерту'
};

export type Dictionary = {
	[K in keyof typeof kk]: (typeof kk)[K] extends string ? string : (typeof kk)[K];
};

const ru: Dictionary = {
	langShort: 'РУ',
	langName: 'Русский',
	locale: 'ru_RU',
	languageSwitcher: 'Выбор языка',
	skipToMenu: 'Перейти к меню',
	menu: 'Меню',
	menuSections: 'Разделы меню',
	menuEmpty: 'Меню скоро обновится',
	metaDescription: (cafe: string) => `Меню и цены ${cafe}`,
	address: 'Адрес',
	hours: 'Часы работы',
	call: 'Позвонить',
	openIn2gis: 'Открыть в 2GIS',
	priceOnRequest: 'Цену уточняйте',
	soldOut: 'Нет в наличии',
	notFound: 'Страница не найдена',
	somethingWentWrong: 'Что-то пошло не так',
	backToMenu: 'Вернуться к меню',

	basket: 'Корзина',
	openBasket: 'Открыть корзину',
	addToBasket: 'Добавить в корзину',
	removeOne: 'Убрать одну порцию',
	inBasket: 'В корзине',
	basketEmpty: 'Корзина пуста',
	total: 'Итого',
	priceOnRequestNote: 'Блюда с ценой по запросу не вошли в сумму',
	soldOutNote: 'Блюда, которых нет в наличии, не войдут в заказ',
	showToWaiter: 'Показать официанту',
	clearBasket: 'Очистить корзину',
	confirmClear: 'Убрать всё из корзины?',
	close: 'Закрыть',
	order: 'Заказ',
	showThisScreen: 'Покажите этот экран официанту',
	editOrder: 'Изменить'
};

export const ui: Record<Lang, Dictionary> = { kk, ru };
