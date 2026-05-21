const REG_PHONE_PREFIX = "eduhub_registration_phone_";
const REG_PARENT_PHONE_PREFIX = "eduhub_registration_parent_phone_";
const REG_PASSPORT_PREFIX = "eduhub_registration_passport_";
const REG_BIRTHDAY_PREFIX = "eduhub_registration_birthday_";
const REG_BIRTH_CITY_PREFIX = "eduhub_registration_birth_city_";

function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export function saveRegistrationPhones(
  email: string,
  phones: {
    phoneNumber: string;
    parentPhoneNumber: string;
    passportNumber?: string;
    dateOfBirth?: string;
    birthCity?: string;
  },
): void {
  if (typeof window === "undefined") return;
  const key = emailKey(email);
  localStorage.setItem(`${REG_PHONE_PREFIX}${key}`, phones.phoneNumber.trim());
  localStorage.setItem(`${REG_PARENT_PHONE_PREFIX}${key}`, phones.parentPhoneNumber.trim());
  if (phones.passportNumber != null) {
    localStorage.setItem(`${REG_PASSPORT_PREFIX}${key}`, phones.passportNumber.trim());
  }
  if (phones.dateOfBirth != null) {
    localStorage.setItem(`${REG_BIRTHDAY_PREFIX}${key}`, phones.dateOfBirth.trim());
  }
  if (phones.birthCity != null) {
    localStorage.setItem(`${REG_BIRTH_CITY_PREFIX}${key}`, phones.birthCity.trim());
  }
}

export function registrationPhoneForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_PHONE_PREFIX}${emailKey(email)}`) ?? "";
}

export function registrationParentPhoneForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_PARENT_PHONE_PREFIX}${emailKey(email)}`) ?? "";
}

export function registrationPassportForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_PASSPORT_PREFIX}${emailKey(email)}`) ?? "";
}

export function registrationDateOfBirthForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_BIRTHDAY_PREFIX}${emailKey(email)}`) ?? "";
}

export function registrationBirthCityForEmail(email: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${REG_BIRTH_CITY_PREFIX}${emailKey(email)}`) ?? "";
}
