import fs from 'fs';
import path from 'path';

// Map from team name (lowercased) to list of raw match objects
const teamMatchesIndex = new Map<string, any[]>();

let isIndexed = false;

export function buildMatchIndex() {
    console.log('[MatchIndex] Construindo índice local de partidas em memória...');

    const statsbombDir = path.join(process.cwd(), '.data', 'statsbomb', 'data');
    if (!fs.existsSync(statsbombDir)) {
        console.error('[MatchIndex] Diretório de dados não encontrado. Sincronização falhou?');
        return;
    }

    // Clear existing indexes
    teamMatchesIndex.clear();
    
    let matchCount = 0;
    const matchesDir = path.join(statsbombDir, 'matches');
    if (fs.existsSync(matchesDir)) {
        const compDirs = fs.readdirSync(matchesDir, { withFileTypes: true });
        for (const compDir of compDirs) {
            if (!compDir.isDirectory()) continue;
            const compPath = path.join(matchesDir, compDir.name);

            const seasonFiles = fs.readdirSync(compPath, { withFileTypes: true });
            for (const seasonFile of seasonFiles) {
                if (!seasonFile.isFile() || !seasonFile.name.endsWith('.json')) continue;

                const seasonPath = path.join(compPath, seasonFile.name);
                try {
                    const matchesData = JSON.parse(fs.readFileSync(seasonPath, 'utf8'));

                    for (const match of matchesData) {
                        const homeTeam = match.home_team?.home_team_name;
                        const awayTeam = match.away_team?.away_team_name;

                        indexTeam(homeTeam, match);
                        indexTeam(awayTeam, match);
                        matchCount++;
                    }
                } catch (e) {
                    console.error(`[MatchIndex] Erro ao ler partidas do arquivo ${seasonFile.name}`, e);
                }
            }
        }
    }

    isIndexed = true;
    console.log(`[MatchIndex] Índice construído com sucesso! ${matchCount} partidas indexadas para ${teamMatchesIndex.size} times únicos.`);
}

function indexTeam(teamName: string, match: any) {
    if (!teamName) return;
    const normalized = teamName.toLowerCase().trim();
    if (!teamMatchesIndex.has(normalized)) {
        teamMatchesIndex.set(normalized, []);
    }
    teamMatchesIndex.get(normalized)!.push(match);
}

export function findTeamMatches(teamName: string): any[] {
    if (!isIndexed) buildMatchIndex();
    const normalized = teamName.toLowerCase().trim();
    return teamMatchesIndex.get(normalized) || [];
}
