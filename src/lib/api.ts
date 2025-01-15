// src/lib/api.ts
import { FPLFixture, FPLTeam } from '@/lib/types';
import sharp from 'sharp';

export async function fetchFixtures(fixtureId?: number): Promise<FPLFixture | FPLFixture[]> {
    const response = await fetch('https://fantasy.premierleague.com/api/fixtures/');
    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.statusText}`);
    }
    const fixtures: FPLFixture[] = await response.json();
    
    if (fixtureId) {
      const fixture = fixtures.find(f => f.id === fixtureId);
      if (!fixture) {
        throw new Error(`Fixture with id ${fixtureId} not found`);
      }
      return fixture;
    }
    
    return fixtures;
  }
  

async function fetchAndOptimizeTeamLogo(code: number): Promise<string> {
    try {
        const response = await fetch(`https://resources.premierleague.com/premierleague/badges/t${code}.png`);
        if (!response.ok) {
          console.warn(`Failed to fetch PNG for team code ${code}: ${response.statusText}`);
          return ''; // Return an empty string if PNG fetch fails
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Resize and optimize the image
        const optimizedBuffer = await sharp(buffer)
          .resize(100, 100) // Resize to 100x100
          .png({ quality: 80 }) // Compress PNG
          .toBuffer();
        
        // Convert to base64
        const base64 = `data:image/png;base64,${optimizedBuffer.toString('base64')}`;
        return base64;
      } catch (error) {
        console.error(`Error optimizing logo for team ${code}:`, error);
        return '';
      }
    }

export async function fetchTeams(): Promise<{ teams: FPLTeam[], events: any[] }> {
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
  if (!response.ok) {
    throw new Error(`Failed to fetch teams: ${response.statusText}`);
  }
  const data = await response.json();
  
  const teamsWithLogos = await Promise.all(data.teams.map(async (team: any) => {
    const optimizedLogo = await fetchAndOptimizeTeamLogo(team.code);
    return {
      ...team,
      logoUrl: optimizedLogo
    };
  }));
  
  return { teams: teamsWithLogos, events: data.events };
}
