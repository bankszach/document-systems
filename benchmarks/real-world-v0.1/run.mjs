const endpoint =
  process.env.DOCUMENT_SYSTEMS_MCP_URL ?? "https://documents.banksinc.us/mcp";

const source = (sourceId, uri, label, availability = "EXCERPT_SUPPLIED") => ({
  source_id: sourceId,
  source_kind: "PRIMARY_SOURCE",
  locator: { uri, label },
  availability,
  review_assertion: {
    status: "REVIEWED_BY_CALLER",
    asserted_by: "real-world benchmark fixture",
  },
});

const cases = [
  {
    id: "osha-emergency-action-plan",
    type: "normative regulation",
    profile: "normative",
    source: {
      id: "SRC-OSHA-1910-38",
      publisher: "Occupational Safety and Health Administration",
      title: "29 CFR 1910.38 - Emergency action plans",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38",
    },
    baseline:
      "OSHA 1910.38 requires an emergency action plan when another OSHA standard requires one. It normally must be written, kept at the workplace, and available to employees. Employers with 10 or fewer employees may communicate it orally. It must cover six minimum elements, an alarm system, trained evacuation assistants, and employee review events.",
    assertions: [
      ["EXC-SMALL-EMPLOYER", "statement", "includes", "10 or fewer"],
      ["REQ-MINIMUM-CONTENT", "statement", "includes", "six minimum elements"],
      ["VERIFY-EMPLOYEE-REVIEW", "statement", "includes", "responsibilities change"],
    ],
    args: {
      work_id: "work:external-benchmark:osha-emergency-action-plan",
      title: "OSHA 1910.38 Emergency Action Plan Requirements",
      purpose:
        "Reconstruct the bounded normative structure of OSHA emergency action plan requirements.",
      primary_profile: "normative",
      scope: ["application", "plan form", "minimum content", "alarm", "training", "review"],
      non_goals: ["legal advice", "workplace compliance determination"],
      source_refs: [
        source(
          "SRC-OSHA-1910-38",
          "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38",
          "29 CFR 1910.38",
        ),
      ],
      elements: [
        {
          element_id: "AUTH-OSHA-1910-38",
          kind: "AUTHORITY",
          title: "Regulatory authority",
          statement:
            "29 CFR 1910.38 applies when another OSHA standard in the same part requires an emergency action plan.",
          source_refs: ["SRC-OSHA-1910-38"],
        },
        {
          element_id: "ROLE-EMPLOYER",
          kind: "ROLE",
          title: "Employer",
          statement: "The employer is responsible for the plan and employee preparation.",
        },
        {
          element_id: "VERIFY-EMPLOYEE-REVIEW",
          kind: "VERIFICATION",
          title: "Employee review events",
          statement:
            "Review with covered employees when the plan is developed or initial assignment occurs, when responsibilities change, and when the plan changes.",
          source_refs: ["SRC-OSHA-1910-38"],
        },
        {
          element_id: "REQ-PLAN-FORM",
          kind: "REQUIREMENT",
          title: "Written and available plan",
          statement:
            "Keep the plan in writing at the workplace and available for employee review unless the small-employer exception applies.",
          actor_ref: "ROLE-EMPLOYER",
          authority_ref: "AUTH-OSHA-1910-38",
          verification_ref: "VERIFY-EMPLOYEE-REVIEW",
          source_refs: ["SRC-OSHA-1910-38"],
        },
        {
          element_id: "REQ-MINIMUM-CONTENT",
          kind: "REQUIREMENT",
          title: "Minimum plan elements",
          statement:
            "Include six minimum elements: reporting, evacuation and routes, critical operations, employee accounting, rescue or medical duties, and an information contact.",
          actor_ref: "ROLE-EMPLOYER",
          authority_ref: "AUTH-OSHA-1910-38",
          verification_ref: "VERIFY-EMPLOYEE-REVIEW",
          source_refs: ["SRC-OSHA-1910-38"],
        },
        {
          element_id: "REQ-ALARM-TRAINING",
          kind: "REQUIREMENT",
          title: "Alarm and training",
          statement:
            "Maintain a distinctive alarm system and designate and train employees to assist safe and orderly evacuation.",
          actor_ref: "ROLE-EMPLOYER",
          authority_ref: "AUTH-OSHA-1910-38",
          verification_ref: "VERIFY-EMPLOYEE-REVIEW",
          source_refs: ["SRC-OSHA-1910-38"],
        },
        {
          element_id: "EXC-SMALL-EMPLOYER",
          kind: "EXCEPTION",
          title: "Oral-plan exception",
          statement:
            "An employer with 10 or fewer employees may communicate the emergency action plan orally.",
          target_ref: "ROLE-EMPLOYER",
          source_refs: ["SRC-OSHA-1910-38"],
        },
      ],
      generated_by: { kind: "CALLER", id: "real-world-benchmark", version: "0.1.0" },
      generation_method: "SYNTHESIS",
    },
    defects: [
      {
        id: "missing-exception",
        class: "structural",
        description: "Remove the small-employer exception.",
        operations: [{ op: "remove_kind", kind: "EXCEPTION" }],
      },
      {
        id: "wrong-threshold",
        class: "semantic",
        description: "Change 10 or fewer employees to 100 or fewer.",
        operations: [
          {
            op: "replace_text",
            element_id: "EXC-SMALL-EMPLOYER",
            from: "10 or fewer",
            to: "100 or fewer",
          },
        ],
      },
    ],
  },
  {
    id: "cisa-incident-response",
    type: "operational playbook",
    profile: "operational",
    source: {
      id: "SRC-CISA-IR-PLAYBOOK",
      publisher: "Cybersecurity and Infrastructure Security Agency",
      title: "Federal Government Cybersecurity Incident and Vulnerability Response Playbooks",
      url: "https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf",
    },
    baseline:
      "The CISA playbook applies to confirmed malicious activity when a major incident is declared or cannot yet be ruled out. The lifecycle begins with declaration and proceeds through detection and analysis, containment, eradication and recovery, and post-incident activity. Analysis can iterate when new compromise appears. Lower-impact or unintentional events follow other procedures.",
    assertions: [
      ["EXC-NON-MAJOR-SCOPE", "statement", "includes", "phishing clicks without compromise"],
      ["TRANS-ANALYZE-CONTAIN", "from_state", "equals", "STATE-ANALYSIS"],
      ["TRANS-RECOVER-POST", "to_state", "equals", "STATE-POST-INCIDENT"],
    ],
    args: {
      work_id: "work:external-benchmark:cisa-incident-response",
      title: "CISA Major-Incident Response Lifecycle",
      purpose: "Reconstruct the operational lifecycle and applicability gate.",
      primary_profile: "operational",
      scope: ["applicability", "declaration", "analysis", "containment", "recovery", "closeout"],
      non_goals: ["operate a live incident", "determine whether activity is malicious"],
      source_refs: [
        source(
          "SRC-CISA-IR-PLAYBOOK",
          "https://www.cisa.gov/sites/default/files/publications/Cybersecurity_Incident_Vulnerability_Response_Playbooks_508C.pdf",
          "CISA Incident Response Playbook pages 5-16",
        ),
      ],
      elements: [
        {
          element_id: "ROLE-FCEB-AGENCY",
          kind: "ROLE",
          title: "Agency response team",
          statement:
            "Declares, investigates, contains, eradicates, recovers, and closes with CISA coordination.",
          source_refs: ["SRC-CISA-IR-PLAYBOOK"],
        },
        {
          element_id: "STATE-DECLARED",
          kind: "STATE",
          title: "Declared",
          statement: "Potential major malicious activity is identified and communicated.",
        },
        {
          element_id: "STATE-ANALYSIS",
          kind: "STATE",
          title: "Detection and analysis",
          statement: "Scope and compromise evidence are being collected and analyzed.",
        },
        {
          element_id: "STATE-CONTAINED",
          kind: "STATE",
          title: "Contained",
          statement: "Detected malicious activity is bounded while analysis continues.",
        },
        {
          element_id: "STATE-RECOVERED",
          kind: "STATE",
          title: "Eradicated and recovered",
          statement: "The threat is removed and systems and services are restored.",
        },
        {
          element_id: "STATE-POST-INCIDENT",
          kind: "STATE",
          title: "Post-incident",
          statement: "The response record and lessons inform process improvement.",
        },
        {
          element_id: "EXC-NON-MAJOR-SCOPE",
          kind: "EXCEPTION",
          title: "Outside playbook scope",
          statement:
            "Route unintentional classified-information spills, phishing clicks without compromise, and isolated low-harm malware or lost hardware to other procedures.",
          target_ref: "ROLE-FCEB-AGENCY",
          source_refs: ["SRC-CISA-IR-PLAYBOOK"],
        },
        {
          element_id: "TRANS-DECLARE-ANALYZE",
          kind: "TRANSITION",
          title: "Declare and scope",
          statement: "Move from declaration into investigation.",
          from_state: "STATE-DECLARED",
          to_state: "STATE-ANALYSIS",
          owner_ref: "ROLE-FCEB-AGENCY",
          gate_evidence_refs: ["SRC-CISA-IR-PLAYBOOK"],
          exception_route_ref: "EXC-NON-MAJOR-SCOPE",
        },
        {
          element_id: "TRANS-ANALYZE-CONTAIN",
          kind: "TRANSITION",
          title: "Contain detected activity",
          statement:
            "Move from analysis to containment when activity is detected; return to analysis if new compromise appears.",
          from_state: "STATE-ANALYSIS",
          to_state: "STATE-CONTAINED",
          owner_ref: "ROLE-FCEB-AGENCY",
          gate_evidence_refs: ["SRC-CISA-IR-PLAYBOOK"],
          exception_route_ref: "EXC-NON-MAJOR-SCOPE",
        },
        {
          element_id: "TRANS-CONTAIN-RECOVER",
          kind: "TRANSITION",
          title: "Eradicate and recover",
          statement: "Move from containment through eradication and recovery.",
          from_state: "STATE-CONTAINED",
          to_state: "STATE-RECOVERED",
          owner_ref: "ROLE-FCEB-AGENCY",
          gate_evidence_refs: ["SRC-CISA-IR-PLAYBOOK"],
          exception_route_ref: "EXC-NON-MAJOR-SCOPE",
        },
        {
          element_id: "TRANS-RECOVER-POST",
          kind: "TRANSITION",
          title: "Close and learn",
          statement: "Move from recovery to post-incident activity.",
          from_state: "STATE-RECOVERED",
          to_state: "STATE-POST-INCIDENT",
          owner_ref: "ROLE-FCEB-AGENCY",
          gate_evidence_refs: ["SRC-CISA-IR-PLAYBOOK"],
          exception_route_ref: "EXC-NON-MAJOR-SCOPE",
        },
      ],
      generated_by: { kind: "CALLER", id: "real-world-benchmark", version: "0.1.0" },
      generation_method: "SYNTHESIS",
    },
    defects: [
      {
        id: "broken-transition-reference",
        class: "structural",
        description: "Point a transition to a state that is not present.",
        operations: [
          {
            op: "set_field",
            element_id: "TRANS-ANALYZE-CONTAIN",
            field: "to_state",
            value: "STATE-NOT-PRESENT",
          },
        ],
      },
      {
        id: "reversed-lifecycle",
        class: "semantic",
        description: "Reverse the valid analysis-to-containment transition.",
        operations: [
          {
            op: "set_field",
            element_id: "TRANS-ANALYZE-CONTAIN",
            field: "from_state",
            value: "STATE-CONTAINED",
          },
          {
            op: "set_field",
            element_id: "TRANS-ANALYZE-CONTAIN",
            field: "to_state",
            value: "STATE-ANALYSIS",
          },
        ],
      },
    ],
  },
  {
    id: "cdc-measles-report",
    type: "research report",
    profile: "research",
    source: {
      id: "SRC-CDC-MEASLES-2025",
      publisher: "Centers for Disease Control and Prevention",
      title: "Measles Update - United States, January 1-April 17, 2025",
      url: "https://www.cdc.gov/mmwr/volumes/74/wr/mm7414a1.htm",
    },
    baseline:
      "CDC reported 800 U.S. measles cases for January 1-April 17, 2025. It associated 654 cases, or 82 percent, with an outbreak in New Mexico, Oklahoma, and Texas. Eighty-five patients were hospitalized and three died. The report described four limitations, including likely underreporting and unresolved outbreak linkages.",
    assertions: [
      ["CLAIM-CASE-COUNT", "statement", "includes", "800"],
      ["CLAIM-OUTBREAK-SHARE", "statement", "includes", "654"],
      ["EXC-REPORT-LIMITATIONS", "statement", "includes", "four limitations"],
    ],
    args: {
      work_id: "work:external-benchmark:cdc-measles-report",
      title: "CDC 2025 Measles Update Reconstruction",
      purpose: "Reconstruct selected claims, evidence status, and limitations.",
      primary_profile: "research",
      scope: ["case count", "outbreak share", "severe outcomes", "limitations"],
      non_goals: ["reanalyze patient data", "establish causality", "replace surveillance"],
      source_refs: [
        source(
          "SRC-CDC-MEASLES-2025",
          "https://www.cdc.gov/mmwr/volumes/74/wr/mm7414a1.htm",
          "CDC MMWR Measles Update",
        ),
      ],
      elements: [
        {
          element_id: "CLAIM-CASE-COUNT",
          kind: "CLAIM",
          title: "Reported case count",
          statement: "CDC reported 800 U.S. measles cases during January 1-April 17, 2025.",
          epistemic_status: "OBSERVED",
          source_refs: ["SRC-CDC-MEASLES-2025"],
          evidence_refs: ["SRC-CDC-MEASLES-2025"],
          assumption_refs: [],
          counterevidence_refs: [],
        },
        {
          element_id: "CLAIM-OUTBREAK-SHARE",
          kind: "CLAIM",
          title: "Three-state outbreak share",
          statement:
            "The report associated 654 cases, or 82 percent, with the ongoing outbreak in New Mexico, Oklahoma, and Texas.",
          epistemic_status: "OBSERVED",
          source_refs: ["SRC-CDC-MEASLES-2025"],
          evidence_refs: ["SRC-CDC-MEASLES-2025"],
          assumption_refs: [],
          counterevidence_refs: [],
        },
        {
          element_id: "CLAIM-SEVERE-OUTCOMES",
          kind: "CLAIM",
          title: "Severe outcomes",
          statement: "The report counted 85 hospitalizations and three deaths.",
          epistemic_status: "OBSERVED",
          source_refs: ["SRC-CDC-MEASLES-2025"],
          evidence_refs: ["SRC-CDC-MEASLES-2025"],
          assumption_refs: [],
          counterevidence_refs: [],
        },
        {
          element_id: "VERIFY-REPORT",
          kind: "VERIFICATION",
          title: "Report check",
          statement:
            "Compare claims to the CDC summary, table, preliminary-data note, and limitations.",
          source_refs: ["SRC-CDC-MEASLES-2025"],
        },
        {
          element_id: "EXC-REPORT-LIMITATIONS",
          kind: "EXCEPTION",
          title: "Reported limitations",
          statement:
            "The report states four limitations, including likely underreporting, incomplete vaccination-status distinction, and unresolved outbreak linkages.",
          source_refs: ["SRC-CDC-MEASLES-2025"],
        },
      ],
      generated_by: { kind: "CALLER", id: "real-world-benchmark", version: "0.1.0" },
      generation_method: "SYNTHESIS",
    },
    defects: [
      {
        id: "evidence-laundering",
        class: "structural",
        description: "Downgrade the only source to reference-only while retaining OBSERVED.",
        operations: [
          {
            op: "set_source_field",
            source_id: "SRC-CDC-MEASLES-2025",
            field: "availability",
            value: "REFERENCE_ONLY",
          },
        ],
      },
      {
        id: "wrong-case-count",
        class: "semantic",
        description: "Change the reported case count from 800 to 8,000.",
        operations: [
          {
            op: "replace_text",
            element_id: "CLAIM-CASE-COUNT",
            from: "800",
            to: "8,000",
          },
        ],
      },
    ],
  },
  {
    id: "nist-human-ai-governance",
    type: "human-agent governance",
    profile: "human-agent",
    source: {
      id: "SRC-NIST-AI-RMF",
      publisher: "National Institute of Standards and Technology",
      title: "AI Risk Management Framework 1.0 Core and Appendix C",
      url: "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
      secondary_url:
        "https://airc.nist.gov/airmf-resources/airmf/appendices/app-c-ai-risk-management-and-human-ai-interaction/",
    },
    baseline:
      "The voluntary AI RMF is not an ordered checklist. Executive leadership takes responsibility for AI development and deployment risk decisions. Human and AI roles should be differentiated, oversight should fit the context, and evaluation should consider system limits, bias, impacts, and joint performance.",
    assertions: [
      ["ALLOC-HUMAN-AUTHORITY", "allocation_party", "equals", "HUMAN"],
      ["ALLOC-AI-ANALYSIS", "allocation_type", "equals", "EXECUTION"],
      ["EVAL-JOINT-OUTCOME", "criterion", "includes", "joint outcome"],
    ],
    args: {
      work_id: "work:external-benchmark:nist-human-ai-governance",
      title: "NIST AI RMF Human-AI Governance Allocation",
      purpose: "Reconstruct a bounded human-agent allocation and evaluation view.",
      primary_profile: "human-agent",
      scope: ["executive authority", "role differentiation", "oversight", "evaluation"],
      non_goals: ["make the framework mandatory", "authorize AI deployment"],
      source_refs: [
        source(
          "SRC-NIST-AI-RMF",
          "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/",
          "NIST AI RMF Core and Appendix C",
        ),
      ],
      elements: [
        {
          element_id: "ROLE-EXECUTIVE",
          kind: "ROLE",
          title: "Executive leadership",
          statement:
            "Takes responsibility for decisions about AI development and deployment risks.",
          source_refs: ["SRC-NIST-AI-RMF"],
        },
        {
          element_id: "ROLE-AI-SYSTEM",
          kind: "ROLE",
          title: "AI system",
          statement: "Performs the bounded task assigned in the human-AI configuration.",
        },
        {
          element_id: "ALLOC-HUMAN-AUTHORITY",
          kind: "HUMAN_AGENT_ALLOCATION",
          title: "Human decision authority",
          statement: "Executive leadership retains risk and deployment authority.",
          owner_ref: "ROLE-EXECUTIVE",
          allocation_party: "HUMAN",
          allocation_type: "AUTHORITY",
          source_refs: ["SRC-NIST-AI-RMF"],
        },
        {
          element_id: "ALLOC-AI-ANALYSIS",
          kind: "HUMAN_AGENT_ALLOCATION",
          title: "AI task execution",
          statement:
            "The AI system performs the defined task and does not inherit executive authority.",
          owner_ref: "ROLE-AI-SYSTEM",
          allocation_party: "AGENT",
          allocation_type: "EXECUTION",
          source_refs: ["SRC-NIST-AI-RMF"],
        },
        {
          element_id: "EVAL-JOINT-OUTCOME",
          kind: "EVALUATION_CRITERION",
          title: "Joint outcome evaluation",
          statement:
            "Evaluate context, system limits, oversight, bias, impacts, and overall performance.",
          criterion:
            "Assess the joint outcome rather than model performance alone.",
          owner_ref: "ROLE-EXECUTIVE",
          source_refs: ["SRC-NIST-AI-RMF"],
        },
        {
          element_id: "EXC-UNCLEAR-ALLOCATION",
          kind: "EXCEPTION",
          title: "Unclear allocation",
          statement:
            "If roles, authority, oversight, or criteria are unclear, return to governance formulation.",
          target_ref: "ROLE-EXECUTIVE",
          source_refs: ["SRC-NIST-AI-RMF"],
        },
      ],
      generated_by: { kind: "CALLER", id: "real-world-benchmark", version: "0.1.0" },
      generation_method: "SYNTHESIS",
    },
    defects: [
      {
        id: "missing-evaluation-criterion",
        class: "structural",
        description: "Remove the evaluation criterion.",
        operations: [{ op: "remove_kind", kind: "EVALUATION_CRITERION" }],
      },
      {
        id: "allocation-fields-removed",
        class: "semantic",
        description: "Remove allocation party and type while leaving the typed element.",
        operations: [
          {
            op: "delete_field",
            element_id: "ALLOC-HUMAN-AUTHORITY",
            field: "allocation_party",
          },
          {
            op: "delete_field",
            element_id: "ALLOC-HUMAN-AUTHORITY",
            field: "allocation_type",
          },
        ],
      },
    ],
  },
];

let requestId = 0;

const clone = (value) => structuredClone(value);
const byteCount = (value) =>
  Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
const tokenProxy = (value) => Math.ceil(byteCount(value) / 4);

function elementById(args, elementId) {
  const element = args.elements.find((candidate) => candidate.element_id === elementId);
  if (!element) throw new Error(`Missing mutation element ${elementId}.`);
  return element;
}

function mutate(args, operations) {
  const output = clone(args);
  for (const operation of operations) {
    if (operation.op === "remove_kind") {
      output.elements = output.elements.filter((element) => element.kind !== operation.kind);
    } else if (operation.op === "set_field") {
      elementById(output, operation.element_id)[operation.field] = operation.value;
    } else if (operation.op === "delete_field") {
      delete elementById(output, operation.element_id)[operation.field];
    } else if (operation.op === "replace_text") {
      const element = elementById(output, operation.element_id);
      if (!element.statement.includes(operation.from)) {
        throw new Error(`${operation.element_id} does not contain ${operation.from}.`);
      }
      element.statement = element.statement.replace(operation.from, operation.to);
    } else if (operation.op === "set_source_field") {
      const item = output.source_refs.find(
        (candidate) => candidate.source_id === operation.source_id,
      );
      if (!item) throw new Error(`Missing mutation source ${operation.source_id}.`);
      item[operation.field] = operation.value;
    } else {
      throw new Error(`Unknown mutation ${operation.op}.`);
    }
  }
  return output;
}

function retained(expression, assertion) {
  const [elementId, field, comparison, expected] = assertion;
  const element = expression.elements.find((candidate) => candidate.element_id === elementId);
  if (!element) return false;
  if (comparison === "equals") return element[field] === expected;
  if (comparison === "includes") {
    return typeof element[field] === "string" && element[field].includes(expected);
  }
  throw new Error(`Unknown assertion comparison ${comparison}.`);
}

async function callTool(name, args) {
  requestId += 1;
  const request = {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: { name, arguments: args },
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://documents.banksinc.us",
    },
    body: JSON.stringify(request),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`${name} HTTP ${response.status}: ${responseText}`);
  const message = JSON.parse(responseText);
  if (message.error || message.result?.isError) {
    throw new Error(`${name} failed: ${responseText}`);
  }
  return { args, structured: message.result.structuredContent };
}

const cleanResults = [];
const defectResults = [];

for (const benchmarkCase of cases) {
  const firstCompose = await callTool(
    "compose_document_expression",
    clone(benchmarkCase.args),
  );
  const secondCompose = await callTool(
    "compose_document_expression",
    clone(benchmarkCase.args),
  );
  const envelope = firstCompose.structured;
  const validation = await callTool("validate_document_expression", {
    envelope,
    supplied_lineage: [],
  });
  const viewType = benchmarkCase.profile === "research" ? "HUMAN_REVIEW" : "HUMAN_ACTION";
  const rendering = await callTool("render_document_view", {
    envelope,
    view_type: viewType,
    format: "MARKDOWN",
    audience: "Independent benchmark reviewer",
    supplied_lineage: [],
  });
  const assertions = benchmarkCase.assertions.map((assertion) => ({
    element_id: assertion[0],
    field: assertion[1],
    passed: retained(envelope.expression, assertion),
  }));
  const requestBytes =
    byteCount(firstCompose.args) + byteCount(validation.args) + byteCount(rendering.args);
  const responseBytes =
    byteCount(envelope) + byteCount(validation.structured) + byteCount(rendering.structured);
  const composeBytes = byteCount(firstCompose.args) + byteCount(envelope);
  const validationBytes = byteCount(validation.args) + byteCount(validation.structured);
  const renderingBytes = byteCount(rendering.args) + byteCount(rendering.structured);
  const pipelineBytes = requestBytes + responseBytes;
  const baselineBytes = byteCount(benchmarkCase.baseline);

  cleanResults.push({
    case_id: benchmarkCase.id,
    document_type: benchmarkCase.type,
    source: benchmarkCase.source,
    profile: benchmarkCase.profile,
    deterministic:
      envelope.expression_id === secondCompose.structured.expression_id,
    expression_id: envelope.expression_id,
    validation_result: validation.structured.result,
    readiness_ok: validation.structured.readiness_ok,
    render_status: rendering.structured.status,
    critical_fact_retention: {
      passed: assertions.filter((assertion) => assertion.passed).length,
      total: assertions.length,
      assertions,
    },
    payload: {
      baseline_bytes: baselineBytes,
      baseline_token_proxy: tokenProxy(benchmarkCase.baseline),
      compose_bytes: composeBytes,
      compose_token_proxy: Math.ceil(composeBytes / 4),
      validation_bytes: validationBytes,
      validation_token_proxy: Math.ceil(validationBytes / 4),
      rendering_bytes: renderingBytes,
      rendering_token_proxy: Math.ceil(renderingBytes / 4),
      pipeline_request_bytes: requestBytes,
      pipeline_response_bytes: responseBytes,
      pipeline_bytes: pipelineBytes,
      pipeline_token_proxy: Math.ceil(pipelineBytes / 4),
      overhead_ratio: Number((pipelineBytes / baselineBytes).toFixed(2)),
    },
  });

  for (const defect of benchmarkCase.defects) {
    const defectCompose = await callTool(
      "compose_document_expression",
      mutate(benchmarkCase.args, defect.operations),
    );
    const defectValidation = await callTool("validate_document_expression", {
      envelope: defectCompose.structured,
      supplied_lineage: [],
    });
    const defectRendering = await callTool("render_document_view", {
      envelope: defectCompose.structured,
      view_type: "HUMAN_ACTION",
      format: "MARKDOWN",
      audience: "Independent benchmark reviewer",
      supplied_lineage: [],
    });
    const receipt = defectValidation.structured;
    defectResults.push({
      case_id: benchmarkCase.id,
      trial_id: defect.id,
      defect_class: defect.class,
      description: defect.description,
      detected: receipt.result !== "PASS" || receipt.readiness_ok !== true,
      validation_result: receipt.result,
      readiness_ok: receipt.readiness_ok,
      action_render_status: defectRendering.structured.status,
      check_ids: receipt.checks.map((check) => check.check_id),
    });
  }
}

const structural = defectResults.filter((trial) => trial.defect_class === "structural");
const semantic = defectResults.filter((trial) => trial.defect_class === "semantic");
const baselineBytes = cleanResults.reduce(
  (sum, result) => sum + result.payload.baseline_bytes,
  0,
);
const pipelineBytes = cleanResults.reduce(
  (sum, result) => sum + result.payload.pipeline_bytes,
  0,
);

const result = {
  schema: "document-systems/real-world-benchmark-result@0.1",
  endpoint,
  methodology: {
    question:
      "Does Document Systems catch consequential defects often enough to justify model-visible payload overhead?",
    baseline:
      "Flat Markdown containing the same caller-extracted facts with no automated reference validator.",
    token_proxy:
      "ceil(UTF-8 bytes / 4); deterministic comparison proxy, not billing tokens.",
    limitations: [
      "The caller still performs source research and semantic extraction.",
      "Fact-retention checks test supplied-input normalization, not interpretation accuracy.",
      "Payload counts omit tool schemas and therefore understate overhead.",
      "Four bounded cases do not establish universal fitness.",
    ],
  },
  clean_cases: {
    passed: cleanResults.filter(
      (item) =>
        item.deterministic &&
        item.validation_result === "PASS" &&
        item.readiness_ok &&
        item.render_status === "RENDERED" &&
        item.critical_fact_retention.passed === item.critical_fact_retention.total,
    ).length,
    total: cleanResults.length,
  },
  defects: {
    detected: defectResults.filter((trial) => trial.detected).length,
    total: defectResults.length,
    structural_detected: structural.filter((trial) => trial.detected).length,
    structural_total: structural.length,
    semantic_detected: semantic.filter((trial) => trial.detected).length,
    semantic_total: semantic.length,
    structural_action_blocked: structural.filter(
      (trial) => trial.action_render_status === "BLOCKED",
    ).length,
    semantic_action_blocked: semantic.filter(
      (trial) => trial.action_render_status === "BLOCKED",
    ).length,
    trials: defectResults,
  },
  payload: {
    baseline_bytes: baselineBytes,
    pipeline_bytes: pipelineBytes,
    baseline_token_proxy: Math.ceil(baselineBytes / 4),
    pipeline_token_proxy: Math.ceil(pipelineBytes / 4),
    overhead_ratio: Number((pipelineBytes / baselineBytes).toFixed(2)),
  },
  cases: cleanResults,
};

console.log(JSON.stringify(result, null, 2));
