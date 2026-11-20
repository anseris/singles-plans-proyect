export interface InterestItem {
  _id: string;
  name: string;
}

export interface GroupItem {
  _id: string;
  name: string;
  description: string;
  city: string;
  ageRange?: { min: number; max: number };
  imageUrl?: string;
  interests?: string[];
}

export interface CreateGroupInput extends Omit<GroupItem, '_id' | 'ageRange' | 'imageUrl' | 'interests'> {
  imageUrl: string;
  interests: string[];
}
