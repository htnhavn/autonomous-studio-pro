
import {
  createDefaultAssetRegistry,
  compileVideoDslToGatewayCommands,
  executeGatewayCommand,
  buildVprojPackage,
  exportProjectToOtioDocument,
  migrateToVideoDslV1,
} from '../packages/core-schema/src';
import { createDefaultStudioProject } from '../apps/desktop/src/store/useStudioStore';
import * as fs from 'fs';
import * as path from 'path';

export function generateVprojAndOtio(outDir: string) {
  const dsl = migrateToVideoDslV1({
    title: 'Macro Crisis 2026: The Liquidity Squeeze',
    genreKit: 'economics-stickman',
    scriptText: 'Tại sao FED tăng lãi suất lại gây chấn động toàn cầu? Dòng tiền khổng lồ đang rút khỏi thị trường như hố đen vũ trụ. Nhưng cơ hội lớn luôn mở ra cho những ai sẵn sàng!',
  });

  let gwState = {
    project: createDefaultStudioProject(dsl.brief.title),
    revision: 1,
    assetRegistry: createDefaultAssetRegistry(),
    undoStack: [],
    redoStack: [],
    auditHistory: []
  };

  const commands = compileVideoDslToGatewayCommands(dsl, 'generator');
  for (const env of commands) {
    gwState = executeGatewayCommand(gwState, env).state;
  }

  const vproj = buildVprojPackage(gwState.project, gwState.assetRegistry, gwState.revision, dsl);
  const otio = exportProjectToOtioDocument(gwState.project, gwState.assetRegistry);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'macro_crisis_2026.vproj.json'), JSON.stringify(vproj, null, 2));
  fs.writeFileSync(path.join(outDir, 'macro_crisis_2026.otio'), JSON.stringify(otio, null, 2));
  console.log('SUCCESS: Generated macro_crisis_2026.vproj.json and macro_crisis_2026.otio in', outDir);
}

const targetDir = process.argv[2] || 'output_product';
generateVprojAndOtio(targetDir);
