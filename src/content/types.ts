export type Quiz = [question: string, options: string[], correct: number][];
export type Content = { s: string; k: string[]; t?: string; z?: Quiz };

/** Обикновен урок: резюме, ключови точки, практическа задача */
export const L = (s: string, k: string[], t?: string): Content => ({ s, k, t });
/** Тест с въпроси: [въпрос, отговори, индекс на верния] */
export const Q = (s: string, z: Quiz): Content => ({ s, k: [], z });
