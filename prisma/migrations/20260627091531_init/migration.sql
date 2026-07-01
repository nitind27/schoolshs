-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "surname" TEXT NOT NULL,
    "aadhaarName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "rationCardNumber" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT,
    "motherName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "guardianName" TEXT,
    "category" TEXT NOT NULL,
    "caste" TEXT,
    "religion" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL DEFAULT 'Unmarried',
    "parentOccupation" TEXT NOT NULL,
    "isOrphan" BOOLEAN NOT NULL DEFAULT false,
    "annualFamilyIncome" REAL NOT NULL,
    "currentAddress" TEXT NOT NULL,
    "currentDistrict" TEXT NOT NULL,
    "currentCity" TEXT NOT NULL,
    "currentPincode" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "permanentDistrict" TEXT NOT NULL,
    "permanentCity" TEXT NOT NULL,
    "permanentPincode" TEXT NOT NULL,
    "habitationType" TEXT NOT NULL DEFAULT 'Own',
    "familySize" INTEGER NOT NULL DEFAULT 4,
    "residentType" TEXT NOT NULL DEFAULT 'Rural',
    "isHosteler" BOOLEAN NOT NULL DEFAULT false,
    "hostelType" TEXT,
    "hostelName" TEXT,
    "scholarshipScheme" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "courseType" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "institutionDistrict" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "currentYear" TEXT NOT NULL,
    "admissionType" TEXT NOT NULL DEFAULT 'Regular',
    "startDate" TEXT,
    "completionDate" TEXT,
    "board10th" TEXT NOT NULL,
    "percentage10th" REAL NOT NULL,
    "year10th" TEXT NOT NULL,
    "board12th" TEXT,
    "percentage12th" REAL,
    "year12th" TEXT,
    "previousQualification" TEXT,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submissionDate" DATETIME,
    "notes" TEXT,
    "validationErrors" TEXT
);

-- CreateTable
CREATE TABLE "BulkSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "studentIds" TEXT NOT NULL,
    "results" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_aadhaarNumber_key" ON "Student"("aadhaarNumber");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_category_idx" ON "Student"("category");

-- CreateIndex
CREATE INDEX "Student_scholarshipScheme_idx" ON "Student"("scholarshipScheme");
