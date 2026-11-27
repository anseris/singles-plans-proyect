export interface PublicUserGroup {
  id: string;
  name: string;
  city: string;
  imageUrl: string;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  location: string;
  aboutMe: string;
  interests: string[];
  memberSince: string;
  maritalStatus?: string;
  groups: PublicUserGroup[];
}
