import pg from "pg";

const { Client } = pg;

/**
 * Dev-only seed data: the demo experiment library (PRODUCT_REQUIREMENTS.md
 * licensing note -- generic Lean-Startup taxonomy, independently written, all
 * status='demo') and the window-cleaning fixture venture used for manual QA
 * and as the Playwright e2e regression case (IMPLEMENTATION_PLAN.md §1.5).
 *
 * Destructive: truncates the tables it seeds before inserting. Never point
 * this at anything but a local/dev database.
 */

interface ExperimentLibrarySeed {
  name: string;
  originalSummary: string;
  experimentFamily: string;
  discoveryOrValidation: "discovery" | "validation";
  applicableDfv: string[];
  applicableAssumptionTypes: string[];
  evidenceStrength: "light" | "medium" | "strong";
  setupTime: "short" | "medium" | "long";
  runTime: "short" | "medium" | "long";
  relativeCost: "low" | "medium" | "high";
  requiredAccess: string;
  procedure: string;
  metrics: string;
  successCriteria: string;
  evidenceProduced: string;
  limitations: string;
  ethicalPrivacyRisks: string;
}

const EXPERIMENT_LIBRARY: ExperimentLibrarySeed[] = [
  {
    name: "Customer interview",
    originalSummary:
      "A structured 1:1 conversation exploring a customer's past behaviour, current workarounds, and the frequency/intensity/consequence of the problem -- not their opinion of your proposed solution.",
    experimentFamily: "customer_interview",
    discoveryOrValidation: "discovery",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["segment", "problem", "adoption"],
    evidenceStrength: "light",
    setupTime: "short",
    runTime: "short",
    relativeCost: "low",
    requiredAccess: "5-15 people matching the target segment, willing to talk for 20-30 minutes.",
    procedure:
      "Ask about specific past incidents and current alternatives rather than hypotheticals; avoid pitching the solution during the interview.",
    metrics:
      "Frequency and severity of the problem as described unprompted; existing workarounds mentioned.",
    successCriteria:
      "A clear majority describe the problem unprompted and can name a specific recent instance.",
    evidenceProduced: "interview_insight",
    limitations:
      "Stated intent and recollection are not the same as observed behaviour; strong on problem discovery, weak on willingness to pay.",
    ethicalPrivacyRisks: "Obtain consent to record; anonymise notes before wider sharing.",
  },
  {
    name: "Survey",
    originalSummary:
      "A structured questionnaire distributed at scale to gauge the prevalence of a problem or preference across a larger sample than interviews allow.",
    experimentFamily: "survey",
    discoveryOrValidation: "discovery",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["segment", "problem"],
    evidenceStrength: "light",
    setupTime: "short",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess: "A distribution channel reaching at least 50-100 target respondents.",
    procedure:
      "Ask about past behaviour and current spend, not future intent; keep it under 5 minutes.",
    metrics: "Response rate; distribution of answers on frequency/severity questions.",
    successCriteria:
      "Statistically meaningful response volume with a consistent pattern across segments.",
    evidenceProduced: "opinion",
    limitations:
      "Self-reported and opinion-based; never sufficient alone for a viability or feasibility claim.",
    ethicalPrivacyRisks: "State how responses will be used; avoid collecting more PII than needed.",
  },
  {
    name: "Landing page test",
    originalSummary:
      "A single page describing the value proposition with a clear call to action, used to measure genuine interest via click-through or sign-up rate before anything is built.",
    experimentFamily: "landing_page_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["solution", "channel", "adoption"],
    evidenceStrength: "medium",
    setupTime: "short",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess: "A way to drive real traffic (ads, existing audience, or partner channel).",
    procedure:
      "Publish the page, drive traffic from the actual target segment, measure conversion on the call to action.",
    metrics: "Visitor-to-signup conversion rate; traffic source quality.",
    successCriteria:
      "Conversion rate meaningfully above a pre-agreed baseline for the traffic source used.",
    evidenceProduced: "observed_behaviour",
    limitations:
      "Measures interest, not willingness to pay or technical feasibility; traffic quality drives the result as much as the offer does.",
    ethicalPrivacyRisks:
      "Disclose the page is a test if it collects contact details; do not imply the product already exists if it does not.",
  },
  {
    name: "Concierge test",
    originalSummary:
      "Delivering the value proposition manually, one customer at a time, without building the underlying product, to learn what customers actually need before automating anything.",
    experimentFamily: "concierge_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["desirability", "feasibility"],
    applicableAssumptionTypes: ["solution", "activity"],
    evidenceStrength: "medium",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "medium",
    requiredAccess:
      "A small number of real customers willing to receive a manually-delivered service.",
    procedure:
      "Deliver the outcome by hand (spreadsheets, manual research, direct labour) while being transparent that it's a pilot.",
    metrics: "Customer satisfaction with the outcome; repeat usage; referrals.",
    successCriteria: "Customers request to continue after the manual pilot ends.",
    evidenceProduced: "observed_behaviour",
    limitations: "Manual delivery doesn't prove the automated version is feasible at scale.",
    ethicalPrivacyRisks:
      "Be honest that delivery is manual if that materially affects the customer's expectations.",
  },
  {
    name: "Wizard of Oz test",
    originalSummary:
      "A test where customers interact with what looks like a working automated product, but the backend is operated manually and invisibly by the team.",
    experimentFamily: "wizard_of_oz",
    discoveryOrValidation: "validation",
    applicableDfv: ["desirability", "feasibility"],
    applicableAssumptionTypes: ["solution", "activity"],
    evidenceStrength: "medium",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "medium",
    requiredAccess:
      "A front-end interface (even a simple one) and a way to manually fulfil requests behind it in real time.",
    procedure:
      "Let customers use the front end as if the automation is real; fulfil requests manually within an acceptable time window.",
    metrics: "Usage frequency; requests fulfilled per user; drop-off rate.",
    successCriteria: "Sustained voluntary usage over the pilot period.",
    evidenceProduced: "observed_behaviour",
    limitations:
      "Confirms desirability of the experience, not that the real automation will perform the same way.",
    ethicalPrivacyRisks:
      "Disclose the manual nature after the pilot if participants might reasonably object to being misled during it.",
  },
  {
    name: "Smoke test",
    originalSummary:
      "Advertising a product or feature that doesn't exist yet to measure demand before committing to build it.",
    experimentFamily: "smoke_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["solution", "channel"],
    evidenceStrength: "medium",
    setupTime: "short",
    runTime: "short",
    relativeCost: "low",
    requiredAccess: "An advertising or distribution channel reaching the target segment.",
    procedure:
      "Run the ad/announcement, route interested clicks to a simple interest-capture form.",
    metrics: "Click-through rate; form completion rate.",
    successCriteria: "Conversion rate above the pre-agreed baseline for the channel.",
    evidenceProduced: "observed_behaviour",
    limitations:
      "Interest is not the same as future payment; must not be presented as an existing product if it isn't.",
    ethicalPrivacyRisks:
      "Do not collect payment for something that doesn't exist; be transparent once contacted.",
  },
  {
    name: "A/B test",
    originalSummary:
      "Randomly splitting traffic or users between two variants of an experience to measure which one produces a better outcome on a defined metric.",
    experimentFamily: "ab_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["solution", "channel"],
    evidenceStrength: "medium",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "medium",
    requiredAccess:
      "Enough existing traffic/users to reach statistical significance in a reasonable time.",
    procedure:
      "Define one metric in advance, split traffic randomly, run until the sample size is reached.",
    metrics: "Conversion or engagement rate per variant, with a significance test.",
    successCriteria:
      "Statistically significant difference favouring one variant on the pre-defined metric.",
    evidenceProduced: "observed_behaviour",
    limitations: "Requires meaningful existing traffic; not useful pre-launch.",
    ethicalPrivacyRisks:
      "Avoid variants that could materially disadvantage or mislead one group of users.",
  },
  {
    name: "Pre-order",
    originalSummary:
      "Asking customers to commit to a future purchase, typically with a partial or full payment, before the product is fully built or delivered.",
    experimentFamily: "pre_order",
    discoveryOrValidation: "validation",
    applicableDfv: ["viability"],
    applicableAssumptionTypes: ["revenue"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess: "A payment mechanism and a clear delivery promise customers can evaluate.",
    procedure:
      "Offer the product at a real price with a real (if future) delivery date; collect payment or a binding commitment.",
    metrics: "Number and value of pre-orders relative to traffic/reach.",
    successCriteria:
      "Pre-order volume covers a pre-agreed threshold of the target market or revenue goal.",
    evidenceProduced: "payment",
    limitations:
      "Delivery risk if the product can't ultimately be built as promised; refund obligations if it can't.",
    ethicalPrivacyRisks:
      "Be truthful about delivery timeline and risk; handle payment data securely.",
  },
  {
    name: "Deposit",
    originalSummary:
      "Asking for a smaller, refundable or partial payment as a lower-friction signal of real commitment than a full pre-order.",
    experimentFamily: "deposit",
    discoveryOrValidation: "validation",
    applicableDfv: ["viability"],
    applicableAssumptionTypes: ["revenue"],
    evidenceStrength: "strong",
    setupTime: "short",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess: "A payment mechanism.",
    procedure: "Offer a refundable deposit that reserves a spot, discount, or early access.",
    metrics: "Deposit conversion rate; deposit-to-final-purchase conversion later.",
    successCriteria: "Deposit rate above the pre-agreed threshold for the traffic source.",
    evidenceProduced: "payment",
    limitations:
      "A refundable deposit is a weaker commitment signal than a non-refundable pre-order or purchase order.",
    ethicalPrivacyRisks: "Make refund terms clear and honour them.",
  },
  {
    name: "Purchase order",
    originalSummary:
      "In B2B contexts, securing a formal purchase order or signed contract with defined terms, typically the strongest pre-delivery commitment signal available.",
    experimentFamily: "purchase_order",
    discoveryOrValidation: "validation",
    applicableDfv: ["viability"],
    applicableAssumptionTypes: ["revenue"],
    evidenceStrength: "strong",
    setupTime: "long",
    runTime: "long",
    relativeCost: "medium",
    requiredAccess: "Access to a budget-holder with real procurement authority.",
    procedure:
      "Negotiate a real contract with defined price, quantity, and delivery terms; get it signed.",
    metrics: "Contract value; number of signed POs relative to opportunities pursued.",
    successCriteria: "At least one signed PO at or near the target price point.",
    evidenceProduced: "payment",
    limitations:
      "Slow sales cycles can make this a late-stage-only test for early discovery timelines.",
    ethicalPrivacyRisks: "Ensure delivery capability genuinely matches contractual promises made.",
  },
  {
    name: "Paid pilot",
    originalSummary:
      "A limited-scope, limited-duration engagement delivered for a real (even if discounted) fee, used to validate both willingness to pay and delivery feasibility together.",
    experimentFamily: "paid_pilot",
    discoveryOrValidation: "validation",
    applicableDfv: ["viability", "feasibility"],
    applicableAssumptionTypes: ["revenue", "activity"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "long",
    relativeCost: "medium",
    requiredAccess: "One or more customers willing to pay for a scoped pilot engagement.",
    procedure:
      "Scope a defined pilot with a real price, deliver it, measure both payment and delivery outcomes.",
    metrics:
      "Pilot fee collected; delivery metrics against the Test Card's success criteria; renewal/expansion interest.",
    successCriteria:
      "Fee paid at or above target price and customer requests to continue post-pilot.",
    evidenceProduced: "payment",
    limitations:
      "Small sample size; pilot pricing/scope may not represent the eventual full offering.",
    ethicalPrivacyRisks: "Be clear about pilot scope and what happens if it doesn't continue.",
  },
  {
    name: "Crowdfunding",
    originalSummary:
      "Publicly soliciting advance payment from many small backers on a dedicated platform, combining demand validation with upfront capital.",
    experimentFamily: "crowdfunding",
    discoveryOrValidation: "validation",
    applicableDfv: ["viability", "desirability"],
    applicableAssumptionTypes: ["revenue", "adoption"],
    evidenceStrength: "strong",
    setupTime: "long",
    runTime: "long",
    relativeCost: "medium",
    requiredAccess:
      "A crowdfunding platform account and enough of an audience to seed early momentum.",
    procedure: "Set a realistic funding target and delivery timeline; run a public campaign.",
    metrics: "Funds raised relative to target; backer count; pledge distribution.",
    successCriteria: "Campaign reaches its funding target within the campaign window.",
    evidenceProduced: "payment",
    limitations:
      "Requires genuine delivery capability -- backers are real customers with real expectations, not just data points.",
    ethicalPrivacyRisks: "Only promise what can realistically be delivered on the stated timeline.",
  },
  {
    name: "Letter of intent",
    originalSummary:
      "A non-binding written statement from a prospective customer or partner expressing intent to purchase or partner in the future, without payment or contractual obligation.",
    experimentFamily: "letter_of_intent",
    discoveryOrValidation: "discovery",
    applicableDfv: ["viability"],
    applicableAssumptionTypes: ["revenue", "partner"],
    evidenceStrength: "light",
    setupTime: "short",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess:
      "A prospective customer or partner contact willing to put stated intent in writing.",
    procedure:
      "Request a short, specific letter describing what they'd want and under what conditions.",
    metrics: "Number and specificity of letters obtained.",
    successCriteria: "Letters describe specific, evaluable conditions rather than vague goodwill.",
    evidenceProduced: "documentary_proof",
    limitations:
      "Non-binding statements of intent are not evidence of payment or of technical performance -- never treat this as proof a technology works.",
    ethicalPrivacyRisks: "Do not imply the letter creates an obligation it doesn't.",
  },
  {
    name: "Clickable prototype test",
    originalSummary:
      "A non-functional, click-through mockup used to observe how users navigate a proposed interface and where they hesitate or drop off.",
    experimentFamily: "prototype_test",
    discoveryOrValidation: "discovery",
    applicableDfv: ["desirability"],
    applicableAssumptionTypes: ["solution"],
    evidenceStrength: "light",
    setupTime: "short",
    runTime: "short",
    relativeCost: "low",
    requiredAccess:
      "A prototyping tool and a handful of target-segment participants for moderated sessions.",
    procedure:
      "Give participants a task, observe where they navigate correctly or get stuck, without leading them.",
    metrics: "Task completion rate; time on task; points of confusion.",
    successCriteria: "Majority of participants complete the core task without assistance.",
    evidenceProduced: "observed_behaviour",
    limitations:
      "Demonstrates UX flow only -- proves nothing about underlying technical performance, reliability, or accuracy.",
    ethicalPrivacyRisks: "Obtain consent for session recording if used.",
  },
  {
    name: "Technical benchmark",
    originalSummary:
      "Running the actual technology against a defined, measurable standard under controlled conditions to quantify its real performance.",
    experimentFamily: "technical_benchmark",
    discoveryOrValidation: "validation",
    applicableDfv: ["feasibility"],
    applicableAssumptionTypes: ["resource", "data"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "medium",
    requiredAccess:
      "A working (even partial) implementation and a representative test dataset or scenario set.",
    procedure:
      "Define the metric and pass/fail threshold in advance; run the system against the test set; record results.",
    metrics: "Accuracy, precision/recall, latency, or the domain-appropriate performance metric.",
    successCriteria: "Meets or exceeds the pre-defined threshold on the representative test set.",
    evidenceProduced: "technical_benchmark",
    limitations:
      "A benchmark on curated data may not reflect messy real-world conditions -- pair with a field test before fully trusting it.",
    ethicalPrivacyRisks:
      "Ensure test data doesn't contain real customer data without consent, or is properly anonymised.",
  },
  {
    name: "Field test",
    originalSummary:
      "Running the technology under real, uncontrolled operating conditions (varied environments, users, or inputs) rather than a curated lab dataset.",
    experimentFamily: "field_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["feasibility"],
    applicableAssumptionTypes: ["resource", "activity"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "long",
    relativeCost: "medium",
    requiredAccess: "A real operating environment and willing participants/sites to test in.",
    procedure:
      "Deploy in real conditions across a representative range of variation (lighting, location, user type, etc.); log outcomes.",
    metrics:
      "Performance metric under real conditions vs. the benchmark result; failure rate by condition.",
    successCriteria:
      "Performance holds within an acceptable margin of the lab benchmark across the tested conditions.",
    evidenceProduced: "operational_proof",
    limitations: "Still a sample of real-world conditions, not exhaustive coverage.",
    ethicalPrivacyRisks:
      "Get consent from any real users/sites involved; handle any data collected per the data-storage plan.",
  },
  {
    name: "Repeatability test",
    originalSummary:
      "Running the same test multiple times under matched conditions to check whether results are consistent or vary unpredictably.",
    experimentFamily: "repeatability_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["feasibility"],
    applicableAssumptionTypes: ["resource"],
    evidenceStrength: "strong",
    setupTime: "short",
    runTime: "medium",
    relativeCost: "low",
    requiredAccess: "The same test setup used in the original benchmark or field test.",
    procedure:
      "Re-run the identical test protocol multiple times; measure variance in the outcome.",
    metrics: "Standard deviation / variance of the result across repeated runs.",
    successCriteria: "Variance stays within a pre-agreed tolerance across repeated runs.",
    evidenceProduced: "technical_benchmark",
    limitations: "Confirms consistency, not accuracy -- a system can be consistently wrong.",
    ethicalPrivacyRisks: "None beyond the underlying test's own risks.",
  },
  {
    name: "Workflow integration test",
    originalSummary:
      "Testing whether the technology fits into a customer's existing operational workflow without unacceptable disruption or extra manual work.",
    experimentFamily: "workflow_integration_test",
    discoveryOrValidation: "validation",
    applicableDfv: ["feasibility"],
    applicableAssumptionTypes: ["activity", "partner"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "long",
    relativeCost: "medium",
    requiredAccess:
      "A real customer's operational environment and staff willing to use the integration.",
    procedure:
      "Integrate with the customer's actual tools/process; observe adoption and friction over a real work period.",
    metrics:
      "Time added or saved per task; staff-reported friction; adoption rate among intended users.",
    successCriteria:
      "Net time/effort impact is neutral-to-positive and staff continue using it without being told to.",
    evidenceProduced: "operational_proof",
    limitations:
      "Results may be specific to that customer's workflow and not generalise to others.",
    ethicalPrivacyRisks:
      "Respect the customer's data-handling requirements and any regulatory constraints in their workflow.",
  },
  {
    name: "Human-vs-AI benchmark",
    originalSummary:
      "Comparing the technology's output against expert human judgement on the same inputs, to establish whether it meets a credible real-world quality bar.",
    experimentFamily: "human_vs_ai_benchmark",
    discoveryOrValidation: "validation",
    applicableDfv: ["feasibility"],
    applicableAssumptionTypes: ["resource", "data"],
    evidenceStrength: "strong",
    setupTime: "medium",
    runTime: "medium",
    relativeCost: "medium",
    requiredAccess:
      "One or more domain experts and a representative set of inputs both will evaluate.",
    procedure:
      "Have experts and the system independently assess the same inputs; compare agreement rate and error patterns.",
    metrics: "Agreement rate with expert judgement; nature and severity of disagreements.",
    successCriteria:
      "Agreement rate meets or exceeds the pre-agreed threshold relative to expert consensus.",
    evidenceProduced: "technical_benchmark",
    limitations:
      "Expert judgement itself may vary between experts; use multiple experts where the domain allows it.",
    ethicalPrivacyRisks:
      "Compensate expert time appropriately; anonymise any customer data used as inputs.",
  },
];

const FIXTURE_USER_ID = "20000000-0000-0000-0000-000000000001";
const FIXTURE_VENTURE_ID = "20000000-0000-0000-0000-000000000002";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and set it.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("begin");

    await client.query("delete from experiment_library");
    for (const experiment of EXPERIMENT_LIBRARY) {
      await client.query(
        `insert into experiment_library
           (name, original_summary, experiment_family, discovery_or_validation, applicable_dfv,
            applicable_assumption_types, evidence_strength, setup_time, run_time, relative_cost,
            required_access, procedure, metrics, success_criteria, evidence_produced, limitations,
            ethical_privacy_risks, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'demo')`,
        [
          experiment.name,
          experiment.originalSummary,
          experiment.experimentFamily,
          experiment.discoveryOrValidation,
          experiment.applicableDfv,
          experiment.applicableAssumptionTypes,
          experiment.evidenceStrength,
          experiment.setupTime,
          experiment.runTime,
          experiment.relativeCost,
          experiment.requiredAccess,
          experiment.procedure,
          experiment.metrics,
          experiment.successCriteria,
          experiment.evidenceProduced,
          experiment.limitations,
          experiment.ethicalPrivacyRisks,
        ],
      );
    }
    console.log(`Seeded ${EXPERIMENT_LIBRARY.length} experiment_library records (status='demo').`);

    // Window-cleaning fixture venture -- IMPLEMENTATION_PLAN.md §1.5 regression case.
    await client.query("delete from ventures where id = $1", [FIXTURE_VENTURE_ID]);
    await client.query("delete from users where id = $1", [FIXTURE_USER_ID]);

    await client.query(
      `insert into users (id, email, display_name) values ($1, $2, $3)
       on conflict (id) do nothing`,
      [FIXTURE_USER_ID, "fixture@dfvsensei.dev", "Fixture User"],
    );

    await client.query(
      `insert into ventures (id, name, short_description, entry_path, stage, owner_id)
       values ($1, $2, $3, 'market_led', 'discovery', $4)`,
      [
        FIXTURE_VENTURE_ID,
        "Glass Cleanliness Inspector",
        "AI-powered tool that analyses real-time images, measures glass cleanliness, and generates professional inspection reports for window-cleaning companies.",
        FIXTURE_USER_ID,
      ],
    );

    await client.query(
      `insert into idea_inputs
         (venture_id, target_customer, problem, solution_or_ip, outcome, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        FIXTURE_VENTURE_ID,
        "window-cleaning companies and their commercial clients",
        "struggle to provide objective evidence of glass cleanliness",
        "an AI-powered tool that analyses real-time images, measures the cleanliness level of the glass, and generates professional inspection reports",
        "clients trust and act on the cleanliness evidence without disputing it",
        FIXTURE_USER_ID,
      ],
    );

    const fixtureAssumptions = [
      {
        statement:
          "We believe window-cleaning companies and their clients need objective evidence of glass cleanliness.",
        dfvPrimary: "desirability",
        assumptionType: "problem",
        actor: "window-cleaning company clients",
        observableBehaviour: "requests or disputes cleanliness evidence after a job",
      },
      {
        statement:
          "We believe the AI can assess glass cleanliness accurately and consistently under real operating conditions.",
        dfvPrimary: "feasibility",
        assumptionType: "resource",
        actor: "the AI system",
        observableBehaviour:
          "matches expert human assessment across varied lighting and glass types",
      },
      {
        statement:
          "We believe window-cleaning companies will pay for AI-generated cleanliness evidence and professional reporting.",
        dfvPrimary: "viability",
        assumptionType: "revenue",
        actor: "window-cleaning company owners",
        observableBehaviour: "commits to a paid pilot or subscription at the proposed price",
      },
    ];

    for (const assumption of fixtureAssumptions) {
      await client.query(
        `insert into assumptions
           (venture_id, statement, dfv_primary, assumption_type, actor, observable_behaviour,
            source, status, owner_id, created_by)
         values ($1, $2, $3, $4, $5, $6, 'user_generated', 'active', $7, $7)`,
        [
          FIXTURE_VENTURE_ID,
          assumption.statement,
          assumption.dfvPrimary,
          assumption.assumptionType,
          assumption.actor,
          assumption.observableBehaviour,
          FIXTURE_USER_ID,
        ],
      );
    }
    console.log("Seeded the window-cleaning fixture venture with 3 assumptions.");

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
