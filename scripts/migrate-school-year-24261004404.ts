import { prisma } from "../src/lib/db";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import path from "path";

const TARGET_SCHOOL_CODE = "24261004404";
const TARGET_YEAR = "2026-27";

async function updateMappedExcel(filename: string) {
  const filePath = path.join(process.cwd(), "file", filename);
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.getWorksheet("Students") || wb.worksheets[0];
    if (!ws) return;

    // Find header row
    const headerRow = ws.getRow(1);
    let finYearColIdx = -1;
    headerRow.eachCell((cell, colNumber) => {
      if (String(cell.value || "").trim() === "financialYear") {
        finYearColIdx = colNumber;
      }
    });

    if (finYearColIdx === -1) {
      // Add column
      finYearColIdx = ws.columnCount + 1;
      headerRow.getCell(finYearColIdx).value = "financialYear";
    }

    const rowCount = ws.rowCount;
    for (let r = 2; r <= rowCount; r++) {
      ws.getRow(r).getCell(finYearColIdx).value = TARGET_YEAR;
    }

    await wb.xlsx.writeFile(filePath);
    console.log(`Updated Excel file ${filename}: set financialYear = ${TARGET_YEAR} for rows 2..${rowCount}`);
  } catch (err: any) {
    console.error(`Error updating Excel file ${filename}:`, err.message);
  }
}

async function main() {
  console.log(`=== Setting Year ${TARGET_YEAR} for School Code ${TARGET_SCHOOL_CODE} ===\n`);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: TARGET_SCHOOL_CODE }, { udiseCode: TARGET_SCHOOL_CODE }] },
    include: { settings: true },
  });

  if (!school) {
    throw new Error(`School with code ${TARGET_SCHOOL_CODE} not found!`);
  }

  console.log(`School: ${school.name} (${school.code}), ID: ${school.id}`);
  console.log(`Current Academic Year in Settings: ${school.settings?.academicYear}`);

  // 1. Update SchoolSettings
  if (school.settings) {
    const updatedSettings = await prisma.schoolSettings.update({
      where: { id: school.settings.id },
      data: { academicYear: TARGET_YEAR },
    });
    console.log(`✓ Updated SchoolSettings (${updatedSettings.id}): academicYear = "${updatedSettings.academicYear}"`);
  } else {
    const newSettings = await prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        schoolName: school.name,
        academicYear: TARGET_YEAR,
      },
    });
    console.log(`✓ Created SchoolSettings (${newSettings.id}): academicYear = "${newSettings.academicYear}"`);
  }

  // 2. Update SchoolClass
  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: school.id },
  });
  console.log(`\nUpdating ${classes.length} SchoolClasses...`);
  for (const c of classes) {
    await prisma.schoolClass.update({
      where: { id: c.id },
      data: { academicYear: TARGET_YEAR },
    });
    console.log(`  ✓ Class "${c.name}" (Std ${c.standard}-${c.section}): academicYear = "${TARGET_YEAR}"`);
  }

  // 3. Update Students
  const studentUpdateResult = await prisma.student.updateMany({
    where: { schoolId: school.id },
    data: { financialYear: TARGET_YEAR },
  });
  console.log(`\n✓ Updated ${studentUpdateResult.count} Students: financialYear = "${TARGET_YEAR}"`);

  // 4. Update GeneralRegisterEntry
  const grEntries = await prisma.generalRegisterEntry.findMany({
    where: { schoolId: school.id },
  });
  console.log(`\nUpdating ${grEntries.length} GeneralRegisterEntries...`);
  for (const gr of grEntries) {
    await prisma.generalRegisterEntry.update({
      where: { id: gr.id },
      data: { academicYear: TARGET_YEAR },
    });
    console.log(`  ✓ GR ${gr.grNumber} (${gr.firstName} ${gr.surname}): academicYear = "${TARGET_YEAR}"`);
  }

  // 5. Update SchoolTimetableConfig
  const ttConfigs = await prisma.schoolTimetableConfig.findMany({
    where: { schoolId: school.id },
  });
  console.log(`\nUpdating ${ttConfigs.length} SchoolTimetableConfig entries...`);
  for (const tt of ttConfigs) {
    await prisma.schoolTimetableConfig.update({
      where: { id: tt.id },
      data: { academicYear: TARGET_YEAR },
    });
    console.log(`  ✓ Timetable config (${tt.id}): academicYear = "${TARGET_YEAR}"`);
  }

  // 6. Update Exams
  const exams = await prisma.exam.findMany({
    where: { schoolId: school.id },
  });
  console.log(`\nUpdating ${exams.length} Exams...`);
  for (const ex of exams) {
    const updatedName = ex.name.replace(/2025-26/g, TARGET_YEAR);
    await prisma.exam.update({
      where: { id: ex.id },
      data: {
        academicYear: TARGET_YEAR,
        name: updatedName,
      },
    });
    console.log(`  ✓ Exam: "${ex.name}" -> "${updatedName}", academicYear = "${TARGET_YEAR}"`);
  }

  // 7. Update ReportCards
  const reportCards = await prisma.reportCard.findMany({
    where: { student: { schoolId: school.id } },
  });
  console.log(`\nUpdating ${reportCards.length} ReportCards...`);
  for (const rc of reportCards) {
    await prisma.reportCard.update({
      where: { id: rc.id },
      data: { academicYear: TARGET_YEAR },
    });
    console.log(`  ✓ ReportCard (${rc.id}): academicYear = "${TARGET_YEAR}"`);
  }

  // 8. Update mapped Excel files
  console.log(`\nUpdating mapped Excel files in file/ ...`);
  const mappedFiles = ["6-B-mapped.xlsx", "7-A-mapped.xlsx", "7-B-mapped.xlsx", "8-B-mapped.xlsx"];
  for (const f of mappedFiles) {
    await updateMappedExcel(f);
  }

  console.log("\n=== MIGRATION COMPLETED SUCCESSFULLY ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
