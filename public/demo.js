const titleElement = document.querySelector("#demo-title");
const statusElement = document.querySelector("#demo-status");
const outputElement = document.querySelector("#demo-output");
const buttons = [...document.querySelectorAll("[data-step]")];

let requestId = 1;
let envelope;

const sampleInput = {
  work_id: "work:demo:incident-response",
  title: "Incident response proposal",
  purpose: "Demonstrate a bounded operational document workflow.",
  primary_profile: "operational",
  scope: ["Proposal modeling and structural review"],
  non_goals: ["External execution", "Human acceptance"],
  source_refs: [{
    source_id: "SRC-DEMO",
    source_kind: "PROVIDED_RECORD",
    locator: { uri: "urn:document-systems:demo", label: "Public demo fixture" },
    availability: "CONTENT_SUPPLIED",
    review_assertion: {
      status: "REVIEWED_BY_CALLER",
      asserted_by: "public-demo",
    },
  }],
  elements: [
    {
      element_id: "ROLE-OPERATOR",
      kind: "ROLE",
      title: "Incident operator",
      statement: "Own the bounded incident review.",
    },
    {
      element_id: "STATE-READY",
      kind: "STATE",
      title: "Ready",
      statement: "Required incident inputs are supplied.",
    },
    {
      element_id: "STATE-RESOLVED",
      kind: "STATE",
      title: "Resolved",
      statement: "The proposed resolution passed its evidence gate.",
    },
    {
      element_id: "EXC-BLOCKED",
      kind: "EXCEPTION",
      title: "Blocked",
      statement: "Stop and return the unresolved evidence gap.",
      owner_ref: "ROLE-OPERATOR",
    },
    {
      element_id: "TRANS-RESOLVE",
      kind: "TRANSITION",
      title: "Resolve incident",
      statement: "Move from ready to resolved after reviewing supplied evidence.",
      from_state: "STATE-READY",
      to_state: "STATE-RESOLVED",
      owner_ref: "ROLE-OPERATOR",
      gate_evidence_refs: ["SRC-DEMO"],
      exception_route_ref: "EXC-BLOCKED",
    },
  ],
};

async function rpc(method, params) {
  const response = await fetch("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId++,
      method,
      params,
    }),
  });
  const message = await response.json();
  if (message.error) {
    throw new Error(message.error.message);
  }
  return message.result;
}

function show(title, status, value) {
  titleElement.textContent = title;
  statusElement.textContent = status;
  outputElement.textContent =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setBusy(activeButton, busy) {
  for (const button of buttons) {
    button.disabled = busy;
    button.removeAttribute("aria-current");
  }
  if (activeButton) {
    activeButton.setAttribute("aria-current", "step");
  }
}

async function runStep(step, button) {
  setBusy(button, true);
  show("Calling Document Systems", `Running ${step} through /mcp…`, {
    state: "IN_PROGRESS",
    persistence: "NONE",
  });
  try {
    if (step === "profiles") {
      const result = await rpc("tools/call", {
        name: "list_document_profiles",
        arguments: {},
      });
      const content = result.structuredContent;
      show("Four bounded profiles", "The catalog is versioned and content-addressed.", {
        profiles: content.profiles.map((profile) => ({
          profile_id: profile.profile_id,
          version: profile.version,
          digest: profile.profile_digest.value,
        })),
        composition_limit: content.composition_limit,
        persistence_status: content.persistence_status,
      });
      return;
    }
    if (step === "compose") {
      const result = await rpc("tools/call", {
        name: "compose_document_expression",
        arguments: sampleInput,
      });
      envelope = result.structuredContent;
      show("Proposal composed", "Deterministic identity without acceptance or persistence.", {
        expression_id: envelope.expression_id,
        proposal_state: envelope.expression.proposal_state,
        primary_profile: envelope.expression.profiles.primary.profile_id,
        element_count: envelope.expression.elements.length,
        integrity: envelope.integrity,
        persistence_status: envelope.persistence_status,
      });
      return;
    }
    if (!envelope) {
      const result = await rpc("tools/call", {
        name: "compose_document_expression",
        arguments: sampleInput,
      });
      envelope = result.structuredContent;
    }
    if (step === "validate") {
      const result = await rpc("tools/call", {
        name: "validate_document_expression",
        arguments: { envelope },
      });
      const receipt = result.structuredContent;
      show("Structural receipt", "PASS remains narrower than truth, fitness, or acceptance.", {
        result: receipt.result,
        integrity_ok: receipt.integrity_ok,
        readiness_ok: receipt.readiness_ok,
        establishes: receipt.establishes,
        not_established: receipt.not_established,
        persistence_status: receipt.persistence_status,
      });
      return;
    }
    if (step === "render") {
      const result = await rpc("tools/call", {
        name: "render_document_view",
        arguments: {
          envelope,
          view_type: "HUMAN_REVIEW",
          format: "MARKDOWN",
          audience: "Public reviewer",
        },
      });
      const view = result.structuredContent;
      show("Traceable review view", "The manifest and artifact remain separate and not persisted.", {
        status: view.status,
        included_element_ids: view.manifest.projection.included_element_ids,
        artifact: view.artifact.text,
        persistence_status: view.persistence_status,
      });
    }
  } catch (error) {
    show("Demo blocked", "The service returned a bounded error.", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    setBusy(button, false);
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => runStep(button.dataset.step, button));
}
