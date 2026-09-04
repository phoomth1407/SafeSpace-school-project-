const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk_level: { type: "string", enum: ["low", "moderate", "high", "severe"] },
    risk_score: { type: "number", minimum: 0, maximum: 100 },
    depression_chance: { type: "string" },
    ai_summary: { type: "string" },
    similar_case: { type: "string" },
    recommendations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["risk_level", "risk_score", "depression_chance", "ai_summary", "similar_case", "recommendations"],
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "AI service is not configured yet." }, 500);

  try {
    const body = await req.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    const language = body?.language === "en" ? "en" : "th";
    const age = typeof body?.age === "number" && Number.isFinite(body.age) ? body.age : null;
    const nationality = body?.nationality === "foreigner" ? "foreigner" : "thai";

    if (answers.length === 0) {
      return json({ error: language === "en" ? "Please provide assessment answers." : "กรุณาส่งคำตอบแบบประเมิน" }, 400);
    }

    const answersText = answers.map((a: any, i: number) =>
      `${i + 1}. [${String(a?.category ?? "").slice(0, 120)}] ${String(a?.question ?? "").slice(0, 500)}\n   Answer: ${String(a?.answer ?? "").slice(0, 500)}`
    ).join("\n\n");

    const ageContext = age !== null
      ? (language === "en" ? `Respondent age: ${age}.` : `อายุผู้ทำแบบประเมิน: ${age} ปี`)
      : "";

    const systemPrompt = language === "en"
      ? `You are a supportive mental-health screening assistant for a youth wellbeing school project.\n\nImportant rules:\n- This is NOT a diagnosis and you must never say the respondent has depression or another disorder.\n- Treat the result as an informal screening/support signal, not a clinical determination.\n- Do not provide instructions or detailed descriptions of self-harm.\n- Use calm, non-judgmental, easy-to-understand language.\n- Assess the overall level of concern from the answers, considering distress, functioning, social support, sleep, anxiety, bullying, family/study pressure, and other wellbeing factors.\n- risk_score is an approximate 0-100 screening signal, not a validated clinical score.\n- If the answers suggest urgent danger or inability to stay safe, recommend getting immediate help from a trusted adult or local emergency/mental-health service.\n- Give 3-5 practical supportive recommendations.`
      : `คุณคือผู้ช่วยคัดกรองสุขภาพจิตอย่างปลอดภัยสำหรับโครงงานโรงเรียนด้านสุขภาวะของเยาวชน\n\nกฎสำคัญ:\n- ผลนี้ไม่ใช่การวินิจฉัย และห้ามบอกว่าผู้ทำแบบประเมินเป็นโรคซึมเศร้าหรือโรคอื่น\n- ให้ถือว่าเป็นเพียงสัญญาณเบื้องต้นเพื่อช่วยทำความเข้าใจความเครียดและสุขภาวะ ไม่ใช่การตัดสินทางคลินิก\n- ห้ามให้คำแนะนำหรือคำบรรยายรายละเอียดเกี่ยวกับการทำร้ายตัวเอง\n- ใช้ภาษาที่อ่อนโยน ไม่ตัดสิน และเข้าใจง่าย\n- ประเมินระดับความกังวลจากคำตอบโดยรวม เช่น ความทุกข์ใจ การใช้ชีวิตประจำวัน การนอน ความกังวล การถูกกลั่นแกล้ง แรงกดดันจากครอบครัว/การเรียน และปัจจัยด้านสุขภาวะอื่น ๆ\n- risk_score เป็นเพียงสัญญาณคัดกรองโดยประมาณ 0-100 ไม่ใช่คะแนนทางคลินิกที่ผ่านการรับรอง\n- หากคำตอบบ่งชี้ถึงอันตรายเร่งด่วนหรือไม่สามารถรักษาความปลอดภัยของตนเองได้ ให้แนะนำให้ติดต่อผู้ใหญ่ที่ไว้ใจได้หรือบริการฉุกเฉิน/สุขภาพจิตในพื้นที่ทันที\n- ให้คำแนะนำที่ทำได้จริง 3-5 ข้อ`;

    const userPrompt = language === "en"
      ? `${ageContext}\nNationality: ${nationality === "thai" ? "Thai" : "Foreigner"}\n\nAssessment answers:\n${answersText}\n\nReturn JSON matching the requested schema.\n\ndepression_chance should NOT diagnose depression; phrase it as a screening signal such as “Low concern based on this screening” or “Higher concern based on this screening”, with one brief reason.\nsimilar_case should describe a broad pattern such as study stress, bullying-related distress, anxiety-like symptoms, or low mood, without naming a diagnosis.`
      : `${ageContext}\nสัญชาติ: ${nationality === "thai" ? "ไทย" : "ต่างชาติ"}\n\nคำตอบแบบประเมิน:\n${answersText}\n\nตอบเป็น JSON ตาม schema ที่กำหนด\n\ndepression_chance ห้ามใช้เพื่อวินิจฉัยโรค ให้ใช้ถ้อยคำในลักษณะ “สัญญาณความกังวลต่ำจากการคัดกรองนี้” หรือ “สัญญาณความกังวลสูงขึ้นจากการคัดกรองนี้” พร้อมเหตุผลสั้น ๆ\nsimilar_case ให้อธิบายรูปแบบกว้าง ๆ เช่น ความเครียดจากการเรียน ความทุกข์จากการกลั่นแกล้ง อาการคล้ายความกังวล หรืออารมณ์เศร้า โดยไม่ระบุว่าเป็นการวินิจฉัยโรค`;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "assessment_result",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      return json({ error: `AI request failed: ${data?.error?.message || "Unknown error"}` }, 502);
    }

    const outputText = typeof data?.output_text === "string"
      ? data.output_text
      : data?.output?.flatMap((item: any) => item?.content || []).find((c: any) => c?.text)?.text;

    if (!outputText) return json({ error: "AI returned no result." }, 502);

    let result;
    try {
      result = JSON.parse(outputText);
    } catch {
      return json({ error: "AI returned an invalid result format." }, 502);
    }

    const validLevels = ["low", "moderate", "high", "severe"];
    const riskLevel = validLevels.includes(result?.risk_level) ? result.risk_level : "moderate";
    const riskScore = Math.max(0, Math.min(100, Number(result?.risk_score) || 50));

    return json({
      risk_level: riskLevel,
      risk_score: riskScore,
      depression_chance: String(result?.depression_chance || ""),
      ai_summary: String(result?.ai_summary || ""),
      similar_case: String(result?.similar_case || ""),
      recommendations: Array.isArray(result?.recommendations) ? result.recommendations.slice(0, 5).map(String) : [],
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
