export interface GroupItem {
  _id: string;
  name: string;
  description: string;
  city: string;
  ageRange?: { min: number; max: number };
  imageUrl?: string;
}

export interface CreateGroupInput extends Omit<GroupItem, '_id' | 'ageRange' | 'imageUrl'> {
  minAge: number | null;
  maxAge: number | null;
  imageUrl: string;
}
