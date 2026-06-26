import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO_URL = 'https://github.com/statsbomb/open-data.git';
const DATA_DIR = path.join(process.cwd(), '.data', 'statsbomb');

export function syncStatsBombData() {
    console.log('[StatsBombSync] Iniciando sincronização do repositório via sparse-checkout...');
    
    // Ensure .data directory exists
    const baseDataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(baseDataDir)) {
        fs.mkdirSync(baseDataDir, { recursive: true });
    }

    if (fs.existsSync(DATA_DIR)) {
        console.log('[StatsBombSync] Repositório já existe. Sincronizando (git pull)...');
        try {
            execSync('git pull', { cwd: DATA_DIR, stdio: 'inherit' });
        } catch (e) {
            console.error('[StatsBombSync] Falha no git pull. Recriando repositório...', e);
            fs.rmSync(DATA_DIR, { recursive: true, force: true });
            cloneSparse();
        }
    } else {
        cloneSparse();
    }
    
    console.log('[StatsBombSync] Sincronização concluída com sucesso!');
}

function cloneSparse() {
    console.log('[StatsBombSync] Clonando metadados do StatsBomb...');
    // Clona apenas a árvore, sem baixar arquivos (blob:none)
    execSync(`git clone --filter=blob:none --sparse --no-checkout ${REPO_URL} ${DATA_DIR}`, { stdio: 'inherit' });
    
    console.log('[StatsBombSync] Configurando sparse-checkout para data/competitions.json e data/matches/');
    execSync('git sparse-checkout set data/competitions.json data/matches/', { cwd: DATA_DIR, stdio: 'inherit' });
    
    console.log('[StatsBombSync] Baixando os arquivos filtrados (git checkout master)...');
    execSync('git checkout master', { cwd: DATA_DIR, stdio: 'inherit' });
}
