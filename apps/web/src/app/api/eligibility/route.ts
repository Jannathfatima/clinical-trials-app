import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * 🔹 OpenAI setup (optional)
 * If you have a key, AI reasoning works. Otherwise, fallback to static text.
 */
const aiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;
if (aiKey) openai = new OpenAI({ apiKey: aiKey });

/**
 * 🧠 ORCHESTRATOR AGENT
 */
async function orchestratorAgent(patientData: any) {
  const trials = await trialFinderAgent(patientData);
  const eligibility = await eligibilityAgent(patientData, trials);
  const reasoning = await medicalReasoningAgent(patientData, eligibility);
  return { trials, eligibility, reasoning };
}

/**
 * 🔍 TRIAL FINDER AGENT
 * Pulls real data from ClinicalTrials.gov
 */
async function trialFinderAgent(patientData: any) {
    try {
      const condition = encodeURIComponent(patientData.condition || "diabetes");
  
      const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${condition}&pageSize=10`;
  
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        cache: "no-store",
      });
  
      console.log("ClinicalTrials.gov status:", res.status);
  
      if (!res.ok) {
        throw new Error(`ClinicalTrials API failed: ${res.status}`);
      }
  
      const data = await res.json();
  
      if (!data.studies || data.studies.length === 0) {
        throw new Error("No studies returned");
      }
  
      return data.studies.map((study: any) => ({
        id: study.protocolSection?.identificationModule?.nctId || "N/A",
        title:
          study.protocolSection?.identificationModule?.briefTitle ||
          "No title",
        condition:
          study.protocolSection?.conditionsModule?.conditions?.[0] ||
          "Unknown",
        location:
          study.protocolSection?.contactsLocationsModule?.locations?.[0]
            ?.country || "Unknown",
      }));
    } catch (err) {
      console.error("Trial Finder API error:", err);
  
      // fallback for demo safety
      return [
        {
          id: "NCT00000001",
          title: "Type 2 Diabetes Clinical Study",
          condition: "Diabetes",
          location: "United States",
        },
        {
          id: "NCT00000002",
          title: "Insulin Resistance Research Trial",
          condition: "Diabetes",
          location: "India",
        },
      ];
    }
  }
  
  
  
  

/**
 * 🧪 ELIGIBILITY AGENT
 * Simple age-based check
 */
async function eligibilityAgent(patientData: any, trials: any[]) {
  if (!patientData.age)
    return trials.map((trial) => ({ trialId: trial.id, eligible: false }));
  return trials.map((trial) => ({
    trialId: trial.id,
    eligible: patientData.age > 18, // simple check
  }));
}

/**
 * 🧑‍⚕️ MEDICAL REASONING AGENT
 * AI reasoning or fallback text
 */
async function medicalReasoningAgent(patientData: any, eligibility: any[]) {
  try {
    if (!openai) {
      return "Based on age and provided condition, patient may qualify for selected trials.";
    }

    const prompt = `
Patient Data: ${JSON.stringify(patientData)}
Trial Eligibility: ${JSON.stringify(eligibility)}

Provide a concise, professional explanation for the patient about why they may or may not qualify.
Keep it safe and patient-friendly.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    return response.choices[0].message?.content || "No reasoning generated";
  } catch (err) {
    console.error("AI reasoning error:", err);
    return "Unable to generate reasoning at this time. Please try again later.";
  }
}

/**
 * 🌐 GET handler
 */
export async function GET() {
  return NextResponse.json({ message: "Use POST to check eligibility" });
}

/**
 * 🌐 POST handler
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.age || !body.condition) {
      return NextResponse.json(
        { error: "Invalid input: 'age' and 'condition' are required" },
        { status: 400 }
      );
    }

    const patientData = { age: body.age, condition: body.condition };
    const result = await orchestratorAgent(patientData);

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/eligibility error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
