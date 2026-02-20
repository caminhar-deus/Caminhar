import { exec } from 'child_process';

// Configurações
const THRESHOLD = parseInt(process.env.DISK_THRESHOLD || '85', 10); // Alerta se uso > 85%
const MOUNT_POINT = process.env.DISK_PATH || '/'; // Verifica a raiz por padrão

console.log(`🔍 Verificando espaço em disco em '${MOUNT_POINT}' (Alerta em ${THRESHOLD}%)...`);

exec(`df -h "${MOUNT_POINT}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro ao executar comando df: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`❌ Erro no comando df: ${stderr}`);
    process.exit(1);
  }

  // Parse da saída do comando df
  // Exemplo de saída:
  // Filesystem      Size  Used Avail Use% Mounted on
  // /dev/sda1       50G   40G   10G  80% /
  
  const lines = stdout.trim().split('\n');
  // Pega a última linha (caso haja quebras) e procura pela porcentagem
  const lastLine = lines[lines.length - 1];
  const match = lastLine.match(/(\d+)%/);

  if (match && match[1]) {
    const usage = parseInt(match[1], 10);
    console.log(`📊 Uso atual: ${usage}%`);

    if (usage >= THRESHOLD) {
      console.error(`\n⚠️  ALERTA: O disco está ficando cheio! (${usage}% utilizado)`);
      console.error(`   Recomendação: Execute 'npm run find-unused' ou limpe backups antigos em 'data/backups'.\n`);
      process.exit(1); // Sai com erro para alertar sistemas de monitoramento/cron
    } else {
      console.log('✅ Espaço em disco saudável.');
    }
  } else {
    console.error('❌ Não foi possível ler a porcentagem de uso.');
    console.log('Saída bruta:', stdout);
    process.exit(1);
  }
});