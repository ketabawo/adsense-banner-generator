import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const requiredVariables = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_REMOTE_DIR'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
  console.error(`デプロイ設定が不足しています: ${missingVariables.join(', ')}`);
  console.error('.env.deploy.example をコピーして .env.deploy を作成してください。');
  process.exit(1);
}

const localDirectory = fileURLToPath(new URL('../build/', import.meta.url));

try {
  await access(localDirectory);
} catch {
  console.error('buildディレクトリがありません。先に npm run build を実行してください。');
  process.exit(1);
}

const client = new Client();
client.ftp.verbose = process.env.FTP_VERBOSE === 'true';

try {
  console.log(`${process.env.FTP_HOST} に接続しています...`);
  await client.access({
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: Number(process.env.FTP_PORT ?? 21),
    secure: process.env.FTP_SECURE !== 'false'
  });

  await client.ensureDir(process.env.FTP_REMOTE_DIR);
  console.log(`${process.env.FTP_REMOTE_DIR} へアップロードしています...`);
  await client.uploadFromDir(localDirectory);
  console.log('デプロイが完了しました。');
} catch (error) {
  console.error('デプロイに失敗しました。');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.close();
}
