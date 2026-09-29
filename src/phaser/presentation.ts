export type Presentation = 'illustrated' | 'classic';
export const presentationFrom = (value: string | null): Presentation => value === 'classic' ? 'classic' : 'illustrated';
export const renderScale = (presentation: Presentation): number => presentation === 'illustrated' ? 3 : 1;
