import { existsSync, readFileSync } from "fs";
import path from "path";
import JSZip from "jszip";

const VBA_REL_TYPE =
  "http://schemas.microsoft.com/office/2006/relationships/vbaProject";
const RIBBON_REL_TYPE =
  "http://schemas.microsoft.com/office/2006/relationships/ui/extensibility";
const WORKBOOK_MACRO_TYPE =
  "application/vnd.ms-excel.sheet.macroEnabled.main+xml";
const WORKBOOK_PLAIN_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const VBA_PART_TYPE = "application/vnd.ms-office.vbaProject";

const RIBBON_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<customUI xmlns="http://schemas.microsoft.com/office/2006/01/customui" onLoad="OnRibbonLoad">
  <ribbon>
    <tabs>
      <tab id="tabShsImport" label="Student import">
        <group id="grpShsForm" label="Entry Form">
          <button id="btnShsOpenForm" label="Go to Entry Form" size="large" onAction="OpenStudentFormBtn" imageMso="FormControlEditBox"/>
          <button id="btnShsSave" label="Add to Students" size="large" onAction="SaveStudentRowBtn" imageMso="TableInsert"/>
          <button id="btnShsClear" label="Clear form" size="large" onAction="ClearEntryFormBtn" imageMso="Clear"/>
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>
`;

function vbaProjectPath() {
  return path.join(process.cwd(), "src", "lib", "import", "macros", "vbaProject.bin");
}

export function hasImportFormMacros() {
  return existsSync(vbaProjectPath());
}

function nextRelId(relsXml: string) {
  const nums = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  return `rId${Math.max(0, ...nums) + 1}`;
}

/** Turn a generated .xlsx buffer into a macro-enabled workbook that opens the student form. */
export async function embedImportFormMacros(xlsx: Buffer): Promise<Buffer> {
  const binPath = vbaProjectPath();
  if (!existsSync(binPath)) return xlsx;

  const zip = await JSZip.loadAsync(xlsx);
  zip.file("xl/vbaProject.bin", readFileSync(binPath));

  const ctFile = zip.file("[Content_Types].xml");
  if (ctFile) {
    let ct = await ctFile.async("string");
    ct = ct.replace(WORKBOOK_PLAIN_TYPE, WORKBOOK_MACRO_TYPE);
    if (!ct.includes('Extension="bin"')) {
      ct = ct.replace(
        /<Types([^>]*)>/,
        `<Types$1><Default Extension="bin" ContentType="${VBA_PART_TYPE}"/>`,
      );
    }
    if (!ct.includes("/xl/vbaProject.bin")) {
      ct = ct.replace(
        "</Types>",
        `<Override PartName="/xl/vbaProject.bin" ContentType="${VBA_PART_TYPE}"/></Types>`,
      );
    }
    if (!ct.includes("/customUI/customUI.xml")) {
      ct = ct.replace(
        "</Types>",
        `<Override PartName="/customUI/customUI.xml" ContentType="application/xml"/></Types>`,
      );
    }
    zip.file("[Content_Types].xml", ct);
  }

  zip.file("customUI/customUI.xml", RIBBON_XML);

  const pkgRelsFile = zip.file("_rels/.rels");
  if (pkgRelsFile) {
    let pkgRels = await pkgRelsFile.async("string");
    if (!pkgRels.includes("customUI/customUI.xml")) {
      const id = nextRelId(pkgRels);
      pkgRels = pkgRels.replace(
        "</Relationships>",
        `<Relationship Id="${id}" Type="${RIBBON_REL_TYPE}" Target="customUI/customUI.xml"/></Relationships>`,
      );
      zip.file("_rels/.rels", pkgRels);
    }
  }

  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (relsFile) {
    let rels = await relsFile.async("string");
    if (!rels.includes("vbaProject.bin")) {
      const id = nextRelId(rels);
      rels = rels.replace(
        "</Relationships>",
        `<Relationship Id="${id}" Type="${VBA_REL_TYPE}" Target="vbaProject.bin"/></Relationships>`,
      );
      zip.file("xl/_rels/workbook.xml.rels", rels);
    }
  }

  return Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );
}
