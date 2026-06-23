import { input } from '@inquirer/prompts';
import { matchOrchestrator } from '../orchestrator/match-orchestrator';

export async function runCLI() {
    console.log(`
   ___       _          _                        
  / _ \\_ __ | |__   ___| |_ ___  ___            
 / /_\\/ '_ \\| '_ \\ / _ \\ __/ __|/ _ \\           
/ /_\\\\| | | | |_) |  __/ |_\\__ \\ (_) |          
\\____/|_| |_|_.__/ \\___|\\__|___/\\___/           
                                                
⚽ Sistema Multiagente de Previsão Esportiva ⚽
================================================
`);

    let running = true;
    while (running) {
        const team1 = await input({ message: 'Digite o nome do PRIMEIRO time/seleção (ou "sair" para encerrar):' });
        
        if (team1.trim().toLowerCase() === 'sair') {
            running = false;
            break;
        }

        const team2 = await input({ message: 'Digite o nome do SEGUNDO time/seleção:' });

        if (team2.trim().toLowerCase() === 'sair') {
            running = false;
            break;
        }

        if (team1.trim() === '' || team2.trim() === '') {
            console.log("Por favor, digite nomes válidos.");
            continue;
        }

        await matchOrchestrator.runPipeline(team1, team2);

        console.log("\n------------------------------------------------");
        const continuePrompt = await input({ message: 'Deseja analisar outra partida? (s/n):' });
        if (continuePrompt.trim().toLowerCase() !== 's') {
            running = false;
        }
    }

    console.log("Encerrando o sistema. Até logo!");
    process.exit(0);
}
