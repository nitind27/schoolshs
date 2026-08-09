/**
 * Advanced Help Bot regression suite.
 * Run: npx tsx scripts/test-help-bot.ts
 */
import { answerHelpConversational } from "../src/lib/help/conversation";
import { detectHelpIntent, expandQueryWithSynonyms } from "../src/lib/help/intents";
import { findBestDiagnostic, formatDiagnosticReply } from "../src/lib/help/diagnostics";
import { wantsHumanAgent } from "../src/lib/help/engine";
import type { UserRole } from "../src/lib/roles";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function ask(
  q: string,
  role: UserRole,
  lang: "en" | "hi" | "gu" = "gu",
  ctx: Parameters<typeof answerHelpConversational>[3] = {},
) {
  return answerHelpConversational(q, role, lang, ctx);
}

console.log("\n=== Help Bot Advanced Tests ===\n");

console.log("1) Intent detection");
assert("howto", detectHelpIntent("વિદ્યાર્થી કેવી રીતે ઉમેરું?").intent === "howto");
assert("troubleshoot", detectHelpIntent("data nahi aa raha").intent === "troubleshoot");
assert("clarify", detectHelpIntent("મને સમજાયું નહીં").intent === "clarify");
assert("escalate gu", detectHelpIntent("સ્ટાફ સાથે વાત").intent === "escalate");
assert("thanks", detectHelpIntent("thanks").intent === "thanks");
assert("affirm", detectHelpIntent("હા").intent === "affirm");

console.log("\n2) Synonyms");
assert(
  "expands student",
  expandQueryWithSynonyms("વિદ્યાર્થી ઉમેરો").toLowerCase().includes("student"),
);
assert(
  "expands attendance",
  expandQueryWithSynonyms("હાજરી માર્ક").toLowerCase().includes("attendance"),
);

console.log("\n3) Human agent detection");
assert("gu staff", wantsHumanAgent("સ્ટાફ સાથે વાત"));
assert("hi staff", wantsHumanAgent("स्टाफ से बात करो"));
assert("en manual", wantsHumanAgent("I need manual help desk"));

console.log("\n4) Topic answers (admin)");
{
  const r = ask("વિદ્યાર્થી કેવી રીતે ઉમેરું?", "school_admin", "gu");
  assert("students topic", r.topicId === "admin-students", `got ${r.topicId}`);
  assert("has steps tone", /પગલાં|બરાબર/i.test(r.text));
  assert("confidence mid+", (r.confidence || 0) >= 40, `conf=${r.confidence}`);
  assert("suggestions", (r.suggestions?.length || 0) >= 2);
}

{
  const r = ask("How do I mark attendance?", "teacher", "en");
  assert("teacher attendance", r.topicId === "teacher-attendance", `got ${r.topicId}`);
  assert("teacher href", (r.href || "").includes("teacher") || r.href === "/teacher/attendance");
}

{
  const r = ask("Open accounting", "school_admin", "en");
  assert("accounting topic", r.topicId === "admin-accounting", `got ${r.topicId}`);
}

console.log("\n5) Follow-up clarify");
{
  const first = ask("scholarship submit", "school_admin", "en");
  const second = ask("I don’t understand, explain simply", "school_admin", "en", {
    lastTopicId: first.topicId,
  });
  assert("stays on scholarship", second.topicId === first.topicId, `got ${second.topicId}`);
  assert("simplify wrap", /simply|explain|Steps|steps/i.test(second.text));
}

console.log("\n6) Diagnostics — data missing FY");
{
  const hit = findBestDiagnostic("data gone after financial year change", "school_admin");
  assert("fy diagnostic", hit?.playbook.id === "data-missing-fy", `got ${hit?.playbook.id}`);
  const r = ask("accounting data missing after year change", "school_admin", "en");
  assert("diag intent", r.intent === "troubleshoot", `got ${r.intent}`);
  assert("diag id", r.diagnosticId === "data-missing-fy", `got ${r.diagnosticId}`);
  assert("asks step", /1\//.test(r.text) || /step/i.test(r.text));

  const next = ask("yes", "school_admin", "en", {
    lastDiagnosticId: r.diagnosticId,
    diagnosticStep: r.diagnosticStep,
    lastIntent: "troubleshoot",
  });
  assert("diag continues", next.diagnosticId === "data-missing-fy");
  assert("next step text", /2\/|Good|next|आगे|આગળ|summary|Checks done|સારાંશ/i.test(next.text));
}

console.log("\n7) Submit to CA diagnostic");
{
  const r = ask("Submit to CA button not showing", "school_admin", "en");
  assert(
    "ca or button diag",
    r.diagnosticId === "submit-ca" || r.diagnosticId === "button-missing",
    `got ${r.diagnosticId}`,
  );
  assert("can escalate", r.canEscalate === true);
}

console.log("\n8) Subjects + roll diagnostics");
{
  const r = ask("subjects assign to class not saving", "school_admin", "en");
  assert("subjects diag", r.diagnosticId === "subjects-assign", `got ${r.diagnosticId}`);
}
{
  const r = ask("auto roll number A to Z", "school_admin", "en");
  assert("roll diag", r.diagnosticId === "roll-order", `got ${r.diagnosticId}`);
}

console.log("\n9) Security isolation");
{
  const r = ask("open teacher panel attendance", "school_admin", "en");
  assert("blocks teacher panel", !r.href?.startsWith("/teacher"), `href=${r.href}`);
}
{
  const r = ask("super admin register school smtp", "clerk", "en");
  assert("blocks super admin", (r.confidence || 0) <= 50);
  assert("no admin href", !r.href?.startsWith("/admin"));
}

console.log("\n10) Escalate + thanks");
{
  const r = ask("સ્ટાફ સાથે વાત", "school_admin", "gu");
  assert("escalate", r.intent === "escalate" && r.canEscalate);
}
{
  const r = ask("thanks", "teacher", "en");
  assert("thanks intent", r.intent === "thanks");
}

console.log("\n11) Ambiguous clarification");
{
  // Force a vague query that might match multiple — engine should still reply usefully
  const r = ask("help", "school_admin", "en");
  assert("low conf or suggestions", (r.confidence || 0) < 60 || (r.suggestions?.length || 0) > 0);
  assert("can escalate vague", r.canEscalate === true || (r.suggestions?.length || 0) > 0);
}

console.log("\n12) Diagnostic formatter unit");
{
  const hit = findBestDiagnostic("password login forgot", "teacher");
  assert("login diag", !!hit);
  if (hit) {
    const a = formatDiagnosticReply(hit.playbook, "en", 0);
    assert("step0 not done", a.done === false && a.nextStep === 1);
    let step = a.nextStep;
    let last = a;
    for (let i = 0; i < 6 && !last.done; i++) {
      last = formatDiagnosticReply(hit.playbook, "en", step);
      step = last.nextStep;
    }
    assert("eventually done", last.done === true);
    assert("has fix", last.text.includes(hit.playbook.fix.en.slice(0, 20)));
  }
}

console.log("\n13) Clerk scholarship path");
{
  const r = ask("How to submit scholarship?", "clerk", "en");
  assert("clerk scholarship", r.topicId === "clerk-scholarship", `got ${r.topicId}`);
}

console.log("\n14) Multi-turn problem → yes → yes");
{
  const r1 = ask("button not visible disabled", "school_admin", "en");
  assert("button diag start", r1.diagnosticId === "button-missing", `got ${r1.diagnosticId}`);
  const r2 = ask("yes", "school_admin", "en", {
    lastDiagnosticId: r1.diagnosticId,
    diagnosticStep: r1.diagnosticStep,
  });
  const r3 = ask("haan", "school_admin", "en", {
    lastDiagnosticId: r2.diagnosticId,
    diagnosticStep: r2.diagnosticStep,
  });
  assert("multi-turn still diag", r3.intent === "troubleshoot" || !!r3.diagnosticId);
}

console.log("\n=== Results ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(failed === 0 ? "\nALL ADVANCED HELP TESTS PASSED\n" : "\nSOME TESTS FAILED\n");
process.exit(failed === 0 ? 0 : 1);
