export type CountryDialCode = {
  iso: string;
  dial: string;
  name: string;
  flag: string;
};

/** Curated list for registration phone pickers (ISO + dial code). */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "UZ", dial: "+998", name: "Uzbekistan", flag: "🇺🇿" },
  { iso: "ID", dial: "+62", name: "Indonesia", flag: "🇮🇩" },
  { iso: "RU", dial: "+7", name: "Russia", flag: "🇷🇺" },
  { iso: "KZ", dial: "+7", name: "Kazakhstan", flag: "🇰🇿" },
  { iso: "KG", dial: "+996", name: "Kyrgyzstan", flag: "🇰🇬" },
  { iso: "TJ", dial: "+992", name: "Tajikistan", flag: "🇹🇯" },
  { iso: "TM", dial: "+993", name: "Turkmenistan", flag: "🇹🇲" },
  { iso: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { iso: "KR", dial: "+82", name: "South Korea", flag: "🇰🇷" },
  { iso: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { iso: "TR", dial: "+90", name: "Turkey", flag: "🇹🇷" },
  { iso: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { iso: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { iso: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { iso: "MY", dial: "+60", name: "Malaysia", flag: "🇲🇾" },
  { iso: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { iso: "TH", dial: "+66", name: "Thailand", flag: "🇹🇭" },
  { iso: "VN", dial: "+84", name: "Vietnam", flag: "🇻🇳" },
  { iso: "PH", dial: "+63", name: "Philippines", flag: "🇵🇭" },
  { iso: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { iso: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { iso: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { iso: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { iso: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
];

export const DEFAULT_COUNTRY_ISO = "UZ";

export function getCountryByIso(iso: string): CountryDialCode {
  return COUNTRY_DIAL_CODES.find((c) => c.iso === iso) ?? COUNTRY_DIAL_CODES[0];
}

/** Build E.164-ish string: dial code + national digits (leading zeros stripped). */
export function composeInternationalPhone(dial: string, national: string): string {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${digits}`;
}
