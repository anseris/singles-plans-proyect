import type { GroupStatus } from '../../groups/models/group.model';

export interface PublicUserGroup {
  id: string;
  name: string;
  city: string;
  imageUrl: string;
  status?: GroupStatus;
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
