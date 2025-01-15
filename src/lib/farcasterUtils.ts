import { User, FarcasterUser } from './types';

const DEFAULT_FID = 1337;
export const DEFAULT_PROFILE_PICTURE = "https://i.imgur.com/mCHMpLT.png";

export function getFID(state: any): number {
  // When Farcaster Hub is implemented, add logic here to get FID from Farcaster
  // For now, we'll just try to get it from state
  const fid = state?.fid;
  
  if (fid && !isNaN(Number(fid))) {
    return Number(fid);
  }
  
  console.log('Using default FID: 1337');
  return DEFAULT_FID;
}

export function parseFarcasterData(interactor: any): FarcasterUser {
    return {
      fid: interactor.fid,
      display_name: interactor.display_name || interactor.username,
      pfp_url: interactor.pfp_url || DEFAULT_PROFILE_PICTURE,
      verifiedAddress: interactor.verified_addresses?.eth_addresses?.[0] || interactor.verified_addresses?.sol_addresses?.[0] || ''
    };
}
  
  export interface CombinedUser extends User {
    pfpUrl: string;
    verifiedAddress: string;
  }
  
  export function combineUserData(dbUser: User, farcasterUser: FarcasterUser): CombinedUser {
    return {
      ...dbUser,
      pfpUrl: farcasterUser.pfp_url,
      verifiedAddress: farcasterUser.verifiedAddress
    };
  }

export function getFarcasterUser(message: any): FarcasterUser {
if (!message || !message.interactor || !message.raw.action.interactor.fid) {
    throw new Error('Invalid message or missing interactor data');
}
return parseFarcasterData(message.raw.action.interactor);
}