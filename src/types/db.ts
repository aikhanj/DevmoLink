export type PhotoMeta = {
  originalPath?: string;
  variants?: { [k in '256'|'512'|'768'|'1080']?: string };
  blurDataURL?: string;
};

export type UserDoc = {
  uid: string;
  name: string;
  email: string;
  campus?: string;
  photo?: PhotoMeta;
  skills: string[];
  goals: string[];
  verifiedEdu?: boolean;
  createdAt: number;
  updatedAt: number;
};