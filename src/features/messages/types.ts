export interface Message {
  body: string;
  date?: string;
  id?: string;
  labelIds?: string[];
  from: string;
  snippet?: string;
  subject?: string;
  to?: string;
}
