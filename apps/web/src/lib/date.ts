const pad = (value: number) => value.toString().padStart(2, "0");

export const formatLocalDateTimeInputValue = (value: Date | string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
};

export const parseLocalDateTimeInputValue = (value: string) => {
  if (!value) {
    return undefined;
  }

  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if ([year, month, day, hours, minutes].some(Number.isNaN)) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes);
};

export const formatDateInputValue = (value: Date | string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const parseDateInputValue = (value: string) => {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if ([year, month, day].some(Number.isNaN)) {
    return undefined;
  }

  return new Date(Date.UTC(year, month - 1, day));
};

export const formatDateOnly = (value: Date | string | null | undefined, locale = "en-US") => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};
