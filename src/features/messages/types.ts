export interface Message {
  body: string;
  date?: string;
  id?: string;
  labelIds?: string[];
  senderEmail: string;
  snippet?: string;
  subject?: string;
  to?: string;
}
