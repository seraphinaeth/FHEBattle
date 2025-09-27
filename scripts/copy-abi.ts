/*
  Copies Hardhat-deploy ABIs from deployments/<network> to ui/src/abi as TS modules.
  Usage: npx ts-node scripts/copy-abi.ts sepolia
*/
import fs from 'fs';
import path from 'path';

const network = process.argv[2] || 'sepolia';
const deploymentsDir = path.join(process.cwd(), 'deployments', network);
const outDir = path.join(process.cwd(), 'ui', 'src', 'abi');

const targets = [
  { name: 'FHEBattle', out: 'FHEBattle.ts', exportName: 'FHEBattleABI' },
  { name: 'ConfidentialGold', out: 'ConfidentialGold.ts', exportName: 'ConfidentialGoldABI' },
];

function run() {
  if (!fs.existsSync(deploymentsDir)) {
    console.error(`Deployments not found: ${deploymentsDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const t of targets) {
    const jsonPath = path.join(deploymentsDir, `${t.name}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.error(`Missing file: ${jsonPath}`);
      process.exit(1);
    }
    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const abi = content.abi;
    const ts = `// Auto-generated from deployments/${network}/${t.name}.json\nexport const ${t.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
    fs.writeFileSync(path.join(outDir, t.out), ts, 'utf8');
    console.log(`Wrote ui/src/abi/${t.out}`);
  }
}

run();

