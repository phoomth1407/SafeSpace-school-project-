import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Check, Heart, LogIn, UserPlus, Sparkles, Shield } from "lucide-react";
import { assessmentCategories } from "@/lib/assessmentQuestions";
import { useAuth } from "@/lib/AuthContext";
import { invokeAssessmentAI, saveAssessmentResponse, getStoredSession } from "@/lib/supabaseClient";
import { useTranslation } from "@/lib/i18n";

export default function Assessment() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t, lang } = useTranslation();
  const [guestMode, setGuestMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("intro");
  const [ageInput, setAgeInput] = useState("");
  const [nationality, setNationality] = useState(lang === "en" ? "" : "thai");

  const showGate = !isAuthenticated && !guestMode;

  const category = assessmentCategories[currentCategory];
  const question = category.questions[lang] || category.questions.th;
  const totalQuestions = assessmentCategories.reduce(
    (sum, c) => sum + (c.questions[lang] || c.questions.th).length,
    0
  );
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;

  const answerKey = `${currentCategory}-${currentQuestion}`;

  const handleSelect = (option) => {
    setAnswers({
      ...answers,
      [answerKey]: {
        category: category.title[lang] || category.title.th,
        question: question[currentQuestion].q,
        answer: option,
      },
    });
  };

  const handleNext = () => {
    if (currentQuestion < question.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentCategory < assessmentCategories.length - 1) {
      setCurrentCategory(currentCategory + 1);
      setCurrentQuestion(0);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentCategory > 0) {
      setCurrentCategory(currentCategory - 1);
      setCurrentQuestion(
        (assessmentCategories[currentCategory - 1].questions[lang] || assessmentCategories[currentCategory - 1].questions.th).length - 1
      );
    }
  };

  const isLast =
    currentCategory === assessmentCategories.length - 1 &&
    currentQuestion === question.length - 1;

  const handleSubmit = async () => {
    if (answeredCount < totalQuestions) {
      for (let i = 0; i < assessmentCategories.length; i++) {
        const qs = assessmentCategories[i].questions[lang] || assessmentCategories[i].questions.th;
        for (let q = 0; q < qs.length; q++) {
          if (!answers[`${i}-${q}`]) {
            setCurrentCategory(i);
            setCurrentQuestion(q);
            setError(t("assess.incompleteMsg"));
            return;
          }
        }
      }
    }
    setLoading(true);
    setError(null);
    try {
      const answersArray = Object.values(answers);
      const session = getStoredSession();
      const result = await invokeAssessmentAI({
        answers: answersArray,
        language: lang,
        age: Number(ageInput),
        nationality,
        token: session?.access_token,
      });

      if (!result || result.error) {
        setError(result?.error || t("assess.error"));
        return;
      }

      let savedId = null;
      if (isAuthenticated && user?.id && session?.access_token) {
        try {
          const saved = await saveAssessmentResponse({
            result,
            answers: answersArray,
            age: Number(ageInput),
            nationality,
            token: session.access_token,
            userId: user.id,
          });
          savedId = saved?.id || null;
        } catch (saveError) {
          console.error("Assessment save failed:", saveError);
        }
      }

      const isGuest = !isAuthenticated || guestMode;
      if (isGuest) {
        navigate("/result", { state: { result, isGuest: true } });
      } else if (savedId) {
        navigate(`/result/${savedId}`);
      } else {
        navigate("/result", { state: { result, isGuest: false } });
      }
    } catch (err) {
      setError(err?.message || t("assess.error"));
    } finally {
      setLoading(false);
    }
  };

  const selected = answers[answerKey]?.answer;
  const options = question[currentQuestion].options;

  if (showGate) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-slate-900/60 rounded-3xl p-8 border border-slate-800 text-center space-y-6 w-full">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/80 to-sky-500/80 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{t("assess.gate.title")}</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{t("assess.gate.subtitle")}</p>
          </div>
          <div className="space-y-2.5">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/login?returnTo=/assessment")} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-900 text-sm font-semibold py-3 rounded-2xl hover:bg-white transition-colors">
              <LogIn className="w-4 h-4" />{t("assess.gate.login")}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/register?returnTo=/assessment")} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-slate-200 text-sm font-semibold py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 transition-colors">
              <UserPlus className="w-4 h-4" />{t("assess.gate.register")}
            </motion.button>
            <div className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-slate-800" /><span className="text-xs text-slate-600">{t("assess.gate.or")}</span><div className="flex-1 h-px bg-slate-800" /></div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setGuestMode(true)} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 py-2.5 rounded-2xl hover:bg-slate-800 hover:text-slate-200 transition-colors">
              <Sparkles className="w-4 h-4" />{t("assess.gate.guest")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "intro") {
    const canStart = ageInput && Number(ageInput) > 0 && (lang !== "en" || nationality);
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-slate-900/60 rounded-3xl p-8 border border-slate-800 w-full space-y-5">
          <div className="text-center space-y-1"><h2 className="text-xl font-bold text-slate-100">{t("assess.intro.title")}</h2><p className="text-sm text-slate-400 leading-relaxed">{t("assess.intro.subtitle")}</p></div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">{t("assess.intro.ageLabel")}</label>
            <input type="number" min="1" max="120" value={ageInput} onChange={(e) => setAgeInput(e.target.value)} placeholder={t("assess.intro.agePlaceholder")} className="w-full text-sm text-slate-200 p-3 rounded-xl bg-slate-800/60 border border-slate-700 focus:outline-none focus:border-slate-600 placeholder:text-slate-500" />
          </div>
          {lang === "en" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">{t("assess.intro.natTitle")}</label>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => setNationality("thai")} className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${nationality === "thai" ? "border-rose-400/60 bg-rose-500/10 text-slate-100 font-medium" : "border-slate-800 text-slate-300 hover:border-slate-700"}`}>{t("assess.intro.natThai")}</button>
                <button onClick={() => setNationality("foreigner")} className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${nationality === "foreigner" ? "border-rose-400/60 bg-rose-500/10 text-slate-100 font-medium" : "border-slate-800 text-slate-300 hover:border-slate-700"}`}>{t("assess.intro.natForeigner")}</button>
              </div>
            </div>
          )}
          {error && <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl text-center border border-red-500/20">{error}</div>}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { if (!ageInput || Number(ageInput) <= 0) { setError(t("assess.intro.ageRequired")); return; } if (lang === "en" && !nationality) { setError(t("assess.intro.ageRequired")); return; } setError(null); setStep("questions"); }} disabled={!canStart} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-900 text-sm font-semibold py-3 rounded-2xl hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><Check className="w-4 h-4" />{t("assess.intro.start")}</motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {guestMode && !isAuthenticated && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-xs text-amber-300">{t("assess.guest.notice")}<button onClick={() => navigate("/login?returnTo=/assessment")} className="underline font-medium ml-1">{t("assess.guest.notice.login")}</button></p>
        </motion.div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500"><span>{answeredCount} / {totalQuestions} {t("assess.progress.of")}</span><span>{Math.round(progress)}%</span></div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-rose-400 to-sky-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} /></div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {assessmentCategories.map((cat, i) => {
          const catQs = cat.questions[lang] || cat.questions.th;
          const catAnswered = catQs.reduce((acc, _q, qi) => acc + (answers[`${i}-${qi}`] ? 1 : 0), 0);
          const catDone = catAnswered === catQs.length;
          return <span key={cat.id} className={`text-[10px] px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${i === currentCategory ? "bg-slate-100 text-slate-900" : catDone ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-900 text-slate-500"}`}>{cat.title[lang] || cat.title.th}{catDone && i !== currentCategory && <Check className="w-2.5 h-2.5" />}</span>;
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={answerKey} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">{category.title[lang] || category.title.th} · {category.subtitle[lang] || category.subtitle.th}</div>
          <h2 className="text-lg font-semibold text-slate-100 leading-snug mb-5">{question[currentQuestion].q}</h2>
          <div className="space-y-2">
            {options.map((option) => <motion.button key={option} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => handleSelect(option)} className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${selected === option ? "border-rose-400/60 bg-rose-500/10 text-slate-100 font-medium" : "border-slate-800 text-slate-300 hover:border-slate-700"}`}>{option}</motion.button>)}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between gap-3">
        <button onClick={handlePrev} disabled={currentCategory === 0 && currentQuestion === 0} className="flex items-center gap-2 text-sm text-slate-400 px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 disabled:opacity-30"><ArrowLeft className="w-4 h-4" />{t("assess.prev")}</button>
        {!isLast ? <button onClick={handleNext} disabled={!selected} className="flex items-center gap-2 text-sm text-slate-900 bg-slate-100 px-5 py-2.5 rounded-xl font-semibold hover:bg-white disabled:opacity-30"><ArrowRight className="w-4 h-4" />{t("assess.next")}</button> : <button onClick={handleSubmit} disabled={loading || !selected} className="flex items-center gap-2 text-sm text-slate-900 bg-slate-100 px-5 py-2.5 rounded-xl font-semibold hover:bg-white disabled:opacity-30">{loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("assess.submitting")}</> : <><Check className="w-4 h-4" />{t("assess.submit")}</>}</button>}
      </div>
      {error && !step === "intro" && <div className="text-center text-sm text-red-400">{error}</div>}
    </div>
  );
}
