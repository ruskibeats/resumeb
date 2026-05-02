import { i18n, type MessageDescriptor, type Messages } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import Cookies from "js-cookie";
import z from "zod";

const localeSchema = z.literal("en-GB");

export type Locale = z.infer<typeof localeSchema>;

const storageKey = "locale";
const defaultLocale: Locale = "en-GB";

export const localeMap = {
  "en-GB": msg`English (United Kingdom)`,
} satisfies Record<Locale, MessageDescriptor>;

export function isLocale(locale: string): locale is Locale {
  return localeSchema.safeParse(locale).success;
}

const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "ckb", // Kurdish (Sorani)
  "dv", // Dhivehi
  "fa", // Persian
  "he", // Hebrew
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
]);

export function isRTL(locale: string): boolean {
  const language = locale.split("-")[0].toLowerCase();
  return RTL_LANGUAGES.has(language);
}

export const getLocale = createIsomorphicFn()
  .client(() => {
    const locale = Cookies.get(storageKey);
    if (!locale || !isLocale(locale)) return defaultLocale;
    return locale;
  })
  .server(async () => {
    const cookieLocale = getCookie(storageKey);
    if (!cookieLocale || !isLocale(cookieLocale)) return defaultLocale;
    return cookieLocale;
  });

export const setLocaleServerFn = createServerFn({ method: "POST" })
  .inputValidator(localeSchema)
  .handler(async ({ data }) => {
    setCookie(storageKey, data);
  });

export const loadLocale = async (locale: string) => {
  if (!isLocale(locale)) locale = defaultLocale;
  const { messages } = await (import(`../../locales/${locale}.js`) as Promise<{ messages: Messages }>);
  i18n.loadAndActivate({ locale, messages });
};