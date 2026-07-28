import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Star, Moon, Sun, ChevronDown, ChevronRight, AlertTriangle,
  Siren, Activity, Brain, Wind, Droplets, Thermometer, Gauge, Baby,
  Flame, Calculator, ListChecks, Clock, ShieldAlert, HeartPulse,
  Stethoscope, ArrowRight, Check, X, Info, LayoutList, RadioTower,
  PersonStanding, ClipboardList
} from "lucide-react";

/* ============================================================
   DONNÉES DE RÉFÉRENCE — SDIS 76 (OPS-ENR-009/010-2025)
   ============================================================ */

const XABCDE_PRIMAIRE = [
  {
    key: "X",
    label: "eXsanguination",
    question: "Hémorragie externe ?",
    critique: "Identification saignement abondant = CRITIQUE",
    action: "Arrêt hémorragie, position d'attente adaptée",
    tier: "critique",
    signes: ["Saignement abondant, hémorragie active non maîtrisée"],
    icon: Droplets,
  },
  {
    key: "A",
    label: "Airways",
    question: "Voies aériennes libres ?",
    critique: "Obstruction totale persistante = CRITIQUE",
    action: "Désobstruction, LVA. Si obstruction partielle : ½ assis, O2 si nécessaire, maintien tête si nécessaire.",
    tier: "critique",
    signes: [
      "Bruits anormaux",
      "Obstacle dans cavité buccale (langue, dents, corps étranger…)",
      "Anomalie au cou (plaie, hématome, déviation de la trachée…)",
    ],
    icon: Wind,
  },
  {
    key: "B",
    label: "Breathing",
    question: "Respiration spontanée et efficace ?",
    critique: "Absence de ventilation efficace (< 1 mvt / 10s) = CRITIQUE",
    action: "RCP/DSA, ventilation BAVU (5 insufflations initiales si enfant ou noyade). Si signe(s) de détresse : O2, ½ assis.",
    tier: "critique",
    signes: ["Bruit / toux", "Tirages", "Asymétrie", "Essoufflement", "Cyanose", "Sueurs"],
    icon: Activity,
  },
  {
    key: "C",
    label: "Circulation",
    question: "Efficacité de la circulation ?",
    critique: "Un ou plusieurs signes de détresse",
    action: "Allongé, O2 si nécessaire.",
    tier: "detresse",
    signes: [
      "Pouls radial mal perçu / filant / irrégulier",
      "Aspect peau (pâleur, marbrures)",
      "Saignement extériorisé ou interne (boîtes à sang : abdomen, fémur, bassin)",
      "Soif",
    ],
    icon: HeartPulse,
  },
  {
    key: "D",
    label: "Disability",
    question: "État de conscience ?",
    critique: "Un ou plusieurs signes de détresse",
    action: "PLS si inconscient, O2 si nécessaire.",
    tier: "detresse",
    signes: [
      "Conscience ou inconscience (EVDA)",
      "PC (perte de connaissance)",
      "Convulsions",
      "Désorientation (espace / temps)",
      "Déficit moteur (paralysie du visage, d'un membre…)",
      "Déficit sensitif",
    ],
    icon: Brain,
  },
  {
    key: "E",
    label: "Exposure",
    question: "Autres lésions vitales ?",
    critique: "Lésions associées",
    action: "Déshabillage sommaire si adapté. Si lésions vitales : position d'attente adaptée, O2 si nécessaire, couverture efficace.",
    tier: "detresse",
    signes: ["Lésions associées (déshabillage sommaire et adapté)"],
    icon: ShieldAlert,
  },
];

const XABCDE_SECONDAIRE = [
  { key: "X", label: "eXsanguination", detail: "Réévaluation de l'arrêt de l'hémorragie", icon: Droplets },
  { key: "A", label: "Airways", detail: "Réévaluation de la liberté des voies aériennes (LVA)", icon: Wind },
  { key: "B", label: "Breathing", detail: "Suite bilan respiratoire — Fréquence respiratoire (FAR : Fréquence, Amplitude, Régularité), SpO2", icon: Activity },
  { key: "C", label: "Circulation", detail: "Suite bilan circulatoire — Température, pression artérielle, fréquence circulatoire (FAR), TRC", icon: HeartPulse },
  { key: "D", label: "Disability", detail: "Suite bilan neurologique — FAST, glycémie capillaire (si indiquée), pupilles", icon: Brain },
  {
    key: "E",
    label: "Exposure",
    detail: "Examen de la tête aux pieds si indiqué (écouter, palper, regarder) — déformation, douleur, impotence, saignement, hématome, plaie, brûlure ; évaluation douleur (si indiquée) ; PQRST pour chaque traumatisme ; MHTAF",
    icon: ShieldAlert,
  },
];

const TIMELINE = ["Bilan circonstanciel", "Bilan primaire", "Bilan XABCDE", "Bilan secondaire", "Surveillance"];

const REF_VALUES = [
  { label: "Fréquence respiratoire", adulte: "12–20", enfant: "20–30", nourrisson: "30–40" },
  { label: "Fréquence circulatoire", adulte: "60–100", enfant: "70–140", nourrisson: "100–160" },
  { label: "Pression artérielle", adulte: "100/80 mmHg (au repos, éveillé)", enfant: "—", nourrisson: "—" },
];

const GLYCEMIE = {
  hypo: "< 3,3 mmol/l · < 60 mg/dl · < 0,6 g/l",
  hyper: "> 6,7 mmol/l · > 120 mg/dl · > 1,20 g/l",
};

const MNEMONICS = [
  { code: "EVDA", full: ["Éveillé", "Voix (réactif à)", "Douleur (réactif à)", "Aréactif"], desc: "État de conscience" },
  { code: "MHTAF", full: ["Maladies (ATCD médicaux)", "Hospitalisations", "Traitements", "Allergies", "Facteurs de risque"], desc: "Antécédents" },
  { code: "PQRST", full: ["Provoqué par", "Qualité (caractéristiques)", "Région (localisation)", "Sévérité (intensité)", "Temps (durée)"], desc: "Analyse de la douleur" },
  { code: "FAST", full: ["Face (visage)", "Arm (bras)", "Speech (parole)", "Time (temps)"], desc: "Suspicion d'AVC" },
];

const FICHE_AIDE_BILANS = {
  circonstanciel: [
    "Nature de l'intervention (risques évidents ou moins évidents / renforts)",
    "Nombre et états des victimes",
    "Âge + sexe",
    "Plainte principale",
    "Position de la victime",
  ],
  detresseImmediate: {
    titre: "Détresse immédiatement vitale",
    sous: "Hémorragie / obstruction voies aériennes / inconscience / arrêt cardiaque",
    action: "Pratiquer rapidement les gestes d'urgence : arrêt hémorragie, LVA, désobstruction, PLS, RCP & DSA",
  },
  detresseMoins: {
    titre: "Détresse vitale moins évidente",
    action: "Pratiquer rapidement le bilan des fonctions vitales — examiner la victime",
  },
  colonnes: {
    respiratoire: ["Cyanose", "Sueurs profuses", "Bruit respiratoire", "Difficulté à respirer ou parler", "Ventilation (FAR)", "SpO2 (air ambiant ou non)", "Utilisation des muscles accessoires (tirage)"],
    circulatoire: ["Pâleur", "Soif", "Angoisse", "Pouls (FAR)", "Pression artérielle", "TRC", "Fièvre", "Conjonctives décolorées"],
    neurologique: ["Inconscience", "Convulsions (nombre et temps)", "Trouble du comportement", "PCP (perte de connaissance passagère)", "Orientation spatio-temporelle", "Motricité / sensibilité des 4 membres", "État des pupilles"],
  },
  complementaire: {
    malaise: { titre: "Malaise et aggravation de maladie", blocs: ["PQRST", "MHTAF"] },
    traumatisme: {
      titre: "Traumatisme (grave ou simple)",
      mecanisme: ["Mécanisme", "Aspect", "Localisation", "Étendue"],
      suite: ["Questionnement de la victime (PQRST pour chaque douleur, MHTAF)", "Palpation complète du corps", "Comparaison avec le côté sain : coloration / chaleur"],
    },
    avc: "En cas d'AVC : Face, Arm, Speech Test, céphalées, trouble de la vue, de l'équilibre et du langage + glycémie.",
  },
  final: ["Pratiquer les gestes de secours adaptés et vérifier leur efficacité", "Position d'attente adaptée", "Surveillance permanente"],
};

const ARBRE_RACHIS_DECISION = [
  { q: "Fiabilité des réponses de la victime ?", non: "Immobilisation (corps entier)", oui: "→ étape suivante" },
  { q: "Présence de signes d'atteinte du rachis / de la moelle épinière ?", oui: "Immobilisation (corps entier)", non: "→ étape suivante" },
  { q: "Traumatisme à haut risque d'atteinte du rachis ?", oui: "Immobilisation (corps entier)", non: "→ étape suivante" },
  { q: "Âge > 65 ans ou antécédents à risque ?", oui: "Immobilisation (corps entier)", non: "Pas d'immobilisation du rachis" },
];

const ARBRE_INTERVENTION_RACHIS = [
  { q: "Recherche d'hémorragie (X) ?", oui: "Arrêt du saignement", non: "→ étape suivante" },
  { q: "Recherche d'urgences vitales évidentes (ABCD) ?", oui: "Les traiter aussitôt leur découverte (détresses respiratoires, circulatoires, neurologiques)", non: "→ étape suivante" },
  { q: "Bilan d'urgences moins évidentes (ABCD) → bilan complémentaire et traumatique → bilan de surveillance renouvelé toutes les 5 minutes maximum", info: true },
  { q: "Transfert difficile ? (ex. ACT, victime debout, agitée, corpulente…)", oui: "Restriction des mouvements = pose de collier et maintien tête", non: "→ étape suivante" },
  { q: "Relevage cuillère possible ?", oui: "Mise en place des blocs de tête et transfert dans le MID pour immobilisation", non: "→ étape suivante" },
  { q: "Relevage en pont amélioré possible ?", oui: "Transfert dans le MID pour immobilisation avec mise en place des blocs de tête", non: "Poser un collier cervical, installer la victime sur un plan dur par roulement au sol avant de la transférer dans un moyen d'immobilisation" },
];

const ARBRE_NOTE = "Maintien tête précoce sans retarder le bilan vital. NB : après immobilisation avec les blocs têtes dans le MID, veiller à desserrer le collier (voire le retirer s'il gêne). Pour un nouveau transfert, le remettre avant toute mobilisation n'assurant pas la rectitude de l'axe tête-cou-tronc.";

/* ---------- Scores / calculateurs ---------- */

const GLASGOW = {
  yeux: [
    { v: 4, label: "Spontanée" },
    { v: 3, label: "À la demande" },
    { v: 2, label: "À la douleur" },
    { v: 1, label: "Aucune" },
  ],
  verbal: [
    { v: 5, label: "Normale" },
    { v: 4, label: "Confuse" },
    { v: 3, label: "Paroles inappropriées" },
    { v: 2, label: "Sons incompréhensibles" },
    { v: 1, label: "Aucune" },
  ],
  moteur: [
    { v: 6, label: "Normale" },
    { v: 5, label: "Localise la douleur" },
    { v: 4, label: "Retrait à la douleur" },
    { v: 3, label: "Flexion anormale des membres" },
    { v: 2, label: "Extension anormale des membres" },
    { v: 1, label: "Aucune" },
  ],
};

const MALINAS_CRITERES = [
  { key: "parite", label: "Parité (grossesses antérieures)", options: [{ v: 0, label: "Une" }, { v: 1, label: "Deux" }, { v: 2, label: "Trois et plus" }] },
  { key: "travail", label: "Durée du travail", options: [{ v: 0, label: "< 3 h" }, { v: 1, label: "Entre 3 et 5 h" }, { v: 2, label: "> 6 h" }] },
  { key: "contractions", label: "Durée des contractions", options: [{ v: 0, label: "< 1 min" }, { v: 1, label: "1 min" }, { v: 2, label: "> 1 min" }] },
  { key: "intervalle", label: "Intervalle entre les contractions", options: [{ v: 0, label: "> 5 min" }, { v: 1, label: "Entre 3 et 5 min" }, { v: 2, label: "< 3 min" }] },
  { key: "eaux", label: "Perte des eaux", options: [{ v: 0, label: "Non" }, { v: 1, label: "Récente (< 1 h)" }, { v: 2, label: "> 1 h" }] },
];

const EVENDOL_CRITERES = [
  { key: "vocal", label: "Expression vocale ou verbale", desc: "Pleure et/ou crie et/ou dit qu'il a mal" },
  { key: "mimique", label: "Mimique", desc: "A le front plissé et/ou les sourcils froncés et/ou la bouche crispée" },
  { key: "mouvements", label: "Mouvements", desc: "S'agite et/ou se raidit et/ou se crispe" },
  { key: "position", label: "Position", desc: "A une attitude inhabituelle et/ou antalgique et/ou se protège et/ou reste immobile" },
  { key: "relation", label: "Relation avec l'environnement", desc: "Peut être consolé et/ou s'intéresse aux jeux et/ou communique avec l'entourage" },
];
const EVENDOL_ECHELLE = [
  { v: 0, label: "Absent", alt: "Normale" },
  { v: 1, label: "Peu intense ou passager", alt: "Diminuée" },
  { v: 2, label: "Moyen ou présent la moitié du temps", alt: "Très diminuée" },
  { v: 3, label: "Fort ou quasi permanent", alt: "Absente" },
];

const WALLACE_ZONES = [
  { key: "tete", label: "Tête", pct: 9 },
  { key: "bras_d", label: "Bras droit", pct: 9 },
  { key: "bras_g", label: "Bras gauche", pct: 9 },
  { key: "torse_av", label: "Torse — face avant", pct: 18 },
  { key: "torse_ar", label: "Torse — face arrière", pct: 18 },
  { key: "jambe_d", label: "Jambe droite", pct: 18 },
  { key: "jambe_g", label: "Jambe gauche", pct: 18 },
  { key: "perinee", label: "Périnée", pct: 1 },
];

/* ---------- Index de recherche ---------- */

const SEARCH_INDEX = [
  { id: "xabcde-primaire", cat: "Protocole", title: "Bilan XABCDE — primaire", tags: "xabcde primaire hémorragie voies aériennes respiration circulation conscience exposition urgence critique", tab: "protocols", anchor: "xabcde" },
  { id: "xabcde-secondaire", cat: "Protocole", title: "Bilan XABCDE — secondaire", tags: "xabcde secondaire réévaluation fréquence tension glycémie pupilles fast", tab: "protocols", anchor: "xabcde" },
  { id: "fiche-aide", cat: "Protocole", title: "Fiche d'aide aux bilans", tags: "fiche aide bilan circonstanciel vital complémentaire respiratoire circulatoire neurologique pqrst mhtaf avc", tab: "protocols", anchor: "fiche-aide" },
  { id: "arbre-decision", cat: "Arbre décisionnel", title: "Immobilisation du rachis — arbre de décision", tags: "rachis immobilisation collier fiabilité traumatisme age", tab: "protocols", anchor: "arbres" },
  { id: "arbre-intervention", cat: "Arbre décisionnel", title: "Mécanismes accidentels à haut risque rachis", tags: "rachis relevage cuillère pont amélioré collier mid transfert", tab: "protocols", anchor: "arbres" },
  { id: "boite-outils", cat: "Référence", title: "Boîte à outils — valeurs de référence", tags: "fréquence respiratoire circulatoire pression artérielle glycémie température spo2 evda mhtaf pqrst fast", tab: "protocols", anchor: "outils" },
  { id: "score-glasgow", cat: "Calculateur", title: "Score de Glasgow", tags: "glasgow conscience yeux verbal moteur coma neurologique", tab: "calc", anchor: "glasgow" },
  { id: "score-malinas", cat: "Calculateur", title: "Score de Malinas", tags: "malinas accouchement imminent parité travail contractions parturiente", tab: "calc", anchor: "malinas" },
  { id: "score-evendol", cat: "Calculateur", title: "Échelle EVENDOL", tags: "evendol douleur pédiatrique enfant hétéroévaluation", tab: "calc", anchor: "evendol" },
  { id: "regle-wallace", cat: "Calculateur", title: "Règle des 9 de Wallace", tags: "wallace brûlure surface corporelle pourcentage", tab: "calc", anchor: "wallace" },
];

/* ============================================================
   OUTILS UI GÉNÉRIQUES
   ============================================================ */

const FAVORITES_KEY = "sdis76-favorites";

function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const toggle = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch (e) {
        /* stockage indisponible (navigation privée, quota…) */
      }
      return next;
    });
  }, []);

  return { favorites, toggle, ready: true };
}

function SectionCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Eyebrow({ children, icon: Icon, tone = "accent" }) {
  const tones = {
    accent: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400",
    ok: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${tones[tone]}`}>
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      <span>{children}</span>
    </div>
  );
}

function Accordion({ title, subtitle, icon: Icon, tone = "slate", defaultOpen = false, children, id }) {
  const [open, setOpen] = useState(defaultOpen);
  const toneRing = {
    slate: "border-slate-200 dark:border-slate-800",
    critical: "border-red-200 dark:border-red-900/60",
    accent: "border-orange-200 dark:border-orange-900/60",
  }[tone];
  return (
    <div id={id} className={`rounded-2xl border ${toneRing} bg-white dark:bg-slate-900 overflow-hidden scroll-mt-24`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-slate-50 dark:active:bg-slate-800/60"
      >
        {Icon && (
          <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <Icon size={19} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-slate-900 dark:text-slate-100 leading-snug">{title}</span>
          {subtitle && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">{children}</div>}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    accent: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/* ============================================================
   MODULE : RECHERCHE & INDEX
   ============================================================ */

function fuzzyMatch(query, text) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = q.split(/\s+/).filter(Boolean);
  const t = text.toLowerCase();
  return words.every((w) => t.includes(w));
}

function SearchView({ query, setQuery, favorites, toggleFavorite, onNavigate }) {
  const results = useMemo(() => {
    if (!query.trim()) return null;
    return SEARCH_INDEX
      .map((item) => ({ item, hit: fuzzyMatch(query, `${item.title} ${item.tags} ${item.cat}`) }))
      .filter((r) => r.hit)
      .map((r) => r.item);
  }, [query]);

  const favItems = SEARCH_INDEX.filter((i) => favorites.includes(i.id));

  return (
    <div className="px-4 pt-3 pb-6 space-y-5">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un score, un signe, une fiche…"
          className="w-full pl-10 pr-9 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none ring-2 ring-transparent focus:ring-orange-500 text-[15px]"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={17} />
          </button>
        )}
      </div>

      {!query && favItems.length > 0 && (
        <div className="space-y-2">
          <Eyebrow icon={Star} tone="accent">Favoris</Eyebrow>
          <div className="space-y-2">
            {favItems.map((item) => (
              <ResultRow key={item.id} item={item} isFav onToggleFav={() => toggleFavorite(item.id)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {!query && (
        <div className="space-y-2">
          <Eyebrow icon={LayoutList}>Index complet</Eyebrow>
          <div className="space-y-2">
            {SEARCH_INDEX.map((item) => (
              <ResultRow key={item.id} item={item} isFav={favorites.includes(item.id)} onToggleFav={() => toggleFavorite(item.id)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {query && (
        <div className="space-y-2">
          <Eyebrow icon={Search}>{results.length} résultat{results.length > 1 ? "s" : ""}</Eyebrow>
          {results.length === 0 && (
            <SectionCard className="p-5 text-center text-slate-500 dark:text-slate-400 text-sm">
              Aucune fiche ne correspond à « {query} ».
            </SectionCard>
          )}
          <div className="space-y-2">
            {results.map((item) => (
              <ResultRow key={item.id} item={item} isFav={favorites.includes(item.id)} onToggleFav={() => toggleFavorite(item.id)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({ item, isFav, onToggleFav, onNavigate }) {
  const catTone = item.cat === "Calculateur" ? "accent" : item.cat === "Arbre décisionnel" ? "critical" : "slate";
  return (
    <SectionCard className="flex items-center gap-3 p-3.5">
      <button onClick={() => onNavigate(item.tab, item.anchor)} className="flex-1 min-w-0 text-left flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Pill tone={catTone}>{item.cat}</Pill>
          </div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">{item.title}</div>
        </div>
      </button>
      <button onClick={onToggleFav} className="shrink-0 p-2 -m-2 text-slate-300 dark:text-slate-600" aria-label="Favori">
        <Star size={20} fill={isFav ? "currentColor" : "none"} className={isFav ? "text-orange-500 dark:text-orange-400" : ""} />
      </button>
      <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-slate-600" />
    </SectionCard>
  );
}

/* ============================================================
   MODULE : CALCULATEURS & SCORES
   ============================================================ */

function SelectorRow({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => {
        const active = value === opt.v;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors ${
              active
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40"
                : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
            }`}
          >
            <span
              className={`shrink-0 grid place-items-center w-7 h-7 rounded-full text-xs font-bold ${
                active ? "bg-orange-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {opt.v}
            </span>
            <span className="text-sm text-slate-800 dark:text-slate-200">{opt.label}</span>
            {active && <Check size={17} className="ml-auto text-orange-500 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function ResultBanner({ tone, title, subtitle, big }) {
  const tones = {
    ok: "bg-emerald-600",
    warning: "bg-amber-500",
    critical: "bg-red-600",
    neutral: "bg-slate-400 dark:bg-slate-700",
  };
  return (
    <div className={`rounded-2xl ${tones[tone]} text-white px-5 py-4 shadow-lg`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide opacity-90">{title}</span>
        {big !== undefined && <span className="text-3xl font-mono font-bold">{big}</span>}
      </div>
      {subtitle && <div className="text-sm mt-1 opacity-95">{subtitle}</div>}
    </div>
  );
}

function GlasgowCalculator() {
  const [yeux, setYeux] = useState(null);
  const [verbal, setVerbal] = useState(null);
  const [moteur, setMoteur] = useState(null);
  const complete = yeux !== null && verbal !== null && moteur !== null;
  const total = complete ? yeux + verbal + moteur : null;

  let tone = "neutral", interp = "Sélectionnez les trois critères pour calculer le score.";
  if (complete) {
    if (total >= 13) { tone = "ok"; interp = "Score léger (13–15) — conscience normale à peu altérée."; }
    else if (total >= 9) { tone = "warning"; interp = "Score modéré (9–12) — altération de la conscience."; }
    else { tone = "critical"; interp = "Score grave (≤ 8) — coma, urgence vitale, renfort médicalisé."; }
  }

  return (
    <div className="space-y-4">
      <ResultBanner tone={tone} title="Score de Glasgow" subtitle={interp} big={total !== null ? `${total}/15` : "–/15"} />
      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Ouverture des yeux</div>
          <SelectorRow options={GLASGOW.yeux} value={yeux} onChange={setYeux} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Réponse verbale</div>
          <SelectorRow options={GLASGOW.verbal} value={verbal} onChange={setVerbal} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Réponse motrice</div>
          <SelectorRow options={GLASGOW.moteur} value={moteur} onChange={setMoteur} />
        </div>
      </div>
    </div>
  );
}

function MalinasCalculator() {
  const [values, setValues] = useState({});
  const keys = MALINAS_CRITERES.map((c) => c.key);
  const complete = keys.every((k) => values[k] !== undefined);
  const total = complete ? keys.reduce((s, k) => s + values[k], 0) : null;

  let tone = "neutral", interp = "Sélectionnez les cinq critères pour calculer le score.";
  if (complete) {
    if (total <= 4) { tone = "ok"; interp = "Score < 5 — transport possible vers une maternité ou une structure médicale."; }
    else if (total === 5) { tone = "warning"; interp = "Score proche du seuil critique — vigilance renforcée."; }
    else { tone = "critical"; interp = "Score ≥ 6 — menace d'accouchement imminent, notamment si envie de pousser."; }
  }

  return (
    <div className="space-y-4">
      <ResultBanner tone={tone} title="Score de Malinas" subtitle={interp} big={total !== null ? `${total}/10` : "–/10"} />
      <div className="space-y-4">
        {MALINAS_CRITERES.map((c) => (
          <div key={c.key}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{c.label}</div>
            <SelectorRow options={c.options} value={values[c.key] ?? null} onChange={(v) => setValues((p) => ({ ...p, [c.key]: v }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EvendolCalculator() {
  const [values, setValues] = useState({});
  const keys = EVENDOL_CRITERES.map((c) => c.key);
  const complete = keys.every((k) => values[k] !== undefined);
  const total = complete ? keys.reduce((s, k) => s + values[k], 0) : null;

  let tone = "neutral", interp = "Sélectionnez les cinq critères pour calculer le score.";
  if (complete) {
    if (total >= 4) { tone = "critical"; interp = "EVENDOL ≥ 4/15 — l'enfant nécessite une prise en charge de la douleur."; }
    else { tone = "ok"; interp = "EVENDOL < 4/15 — douleur non significative selon l'échelle."; }
  }

  return (
    <div className="space-y-4">
      <ResultBanner tone={tone} title="Échelle EVENDOL" subtitle={interp} big={total !== null ? `${total}/15` : "–/15"} />
      <div className="space-y-4">
        {EVENDOL_CRITERES.map((c) => (
          <div key={c.key}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-2 italic">{c.desc}</div>
            <SelectorRow
              options={EVENDOL_ECHELLE.map((e) => ({ v: e.v, label: c.key === "relation" ? e.alt : e.label }))}
              value={values[c.key] ?? null}
              onChange={(v) => setValues((p) => ({ ...p, [c.key]: v }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function WallaceCalculator() {
  const [checked, setChecked] = useState({});
  const total = WALLACE_ZONES.reduce((s, z) => s + (checked[z.key] ? z.pct : 0), 0);
  const any = Object.values(checked).some(Boolean);

  return (
    <div className="space-y-4">
      <ResultBanner
        tone={any ? "warning" : "neutral"}
        title="Règle des 9 de Wallace"
        subtitle={any ? "Surface corporelle brûlée estimée — se référer au protocole médical pour la prise en charge." : "Sélectionnez les zones atteintes pour estimer la surface brûlée."}
        big={`${total}%`}
      />
      <div className="grid grid-cols-1 gap-2">
        {WALLACE_ZONES.map((z) => {
          const active = !!checked[z.key];
          return (
            <button
              key={z.key}
              onClick={() => setChecked((p) => ({ ...p, [z.key]: !p[z.key] }))}
              className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left ${
                active ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
              }`}
            >
              <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-full text-xs font-bold ${active ? "bg-orange-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                {z.pct}%
              </span>
              <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{z.label}</span>
              {active && <Check size={17} className="text-orange-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalcView() {
  const [tool, setTool] = useState("glasgow");
  const tools = [
    { key: "glasgow", label: "Glasgow", icon: Brain },
    { key: "malinas", label: "Malinas", icon: Baby },
    { key: "evendol", label: "EVENDOL", icon: Baby },
    { key: "wallace", label: "Wallace", icon: Flame },
  ];
  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <Eyebrow icon={Calculator}>Calculateurs & scores</Eyebrow>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {tools.map((t) => {
          const active = tool === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              id={`calc-${t.key}`}
              onClick={() => setTool(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                active ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>
      {tool === "glasgow" && <div id="glasgow"><GlasgowCalculator /></div>}
      {tool === "malinas" && <div id="malinas"><MalinasCalculator /></div>}
      {tool === "evendol" && <div id="evendol"><EvendolCalculator /></div>}
      {tool === "wallace" && <div id="wallace"><WallaceCalculator /></div>}
    </div>
  );
}

/* ============================================================
   MODULE : ARBRES & PROTOCOLES
   ============================================================ */

function XabcdeWheel({ mode, setMode }) {
  const [active, setActive] = useState("X");
  const [checks, setChecks] = useState({}); // { [letterKey]: { [signIndex]: boolean } }
  const data = mode === "primaire" ? XABCDE_PRIMAIRE : XABCDE_SECONDAIRE;
  const current = data.find((d) => d.key === active);
  const positions = {
    X: "top-0 left-1/2 -translate-x-1/2",
    A: "top-[18%] right-0",
    B: "bottom-[18%] right-0",
    C: "bottom-0 left-1/2 -translate-x-1/2",
    D: "bottom-[18%] left-0",
    E: "top-[18%] left-0",
  };

  const toggleSign = (letterKey, idx) => {
    setChecks((prev) => {
      const letterChecks = { ...(prev[letterKey] || {}) };
      letterChecks[idx] = !letterChecks[idx];
      return { ...prev, [letterKey]: letterChecks };
    });
  };

  const isTouched = (letterKey) => checks[letterKey] !== undefined;
  const anyChecked = (letterKey) => Object.values(checks[letterKey] || {}).some(Boolean);

  const criticalLetters = ["X", "A", "B"];
  const detresseLetters = ["C", "D", "E"];
  const anyCriticalChecked = mode === "primaire" && criticalLetters.some((k) => anyChecked(k));
  const anyDetresseChecked = mode === "primaire" && detresseLetters.some((k) => anyChecked(k));
  const allTouched = mode === "primaire" && XABCDE_PRIMAIRE.every((d) => isTouched(d.key));

  return (
    <div className="space-y-4">
      <div className="flex rounded-full bg-slate-100 dark:bg-slate-800 p-1">
        {["primaire", "secondaire"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-white dark:bg-slate-950 text-orange-600 dark:text-orange-400 shadow" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Bilan {m}
          </button>
        ))}
      </div>

      <div className="relative w-full aspect-square max-w-[280px] mx-auto my-2">
        <div className="absolute inset-[16%] rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700" />
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <ArrowRight size={20} className="text-slate-300 dark:text-slate-600 -rotate-45" />
        </div>
        {data.map((d) => {
          const Icon = d.icon;
          const isActive = active === d.key;
          const letterChecked = mode === "primaire" && anyChecked(d.key);
          const letterTouched = mode === "primaire" && isTouched(d.key) && !letterChecked;
          return (
            <button
              key={d.key}
              onClick={() => setActive(d.key)}
              className={`absolute ${positions[d.key]} grid place-items-center w-16 h-16 rounded-2xl border-2 transition-all ${
                isActive
                  ? "bg-orange-500 border-orange-500 text-white scale-110 shadow-lg z-10"
                  : letterChecked
                  ? "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-600 dark:text-red-400"
                  : letterTouched
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300"
              }`}
            >
              <span className="text-lg font-mono font-black leading-none">{d.key}</span>
              <Icon size={13} className="mt-0.5" />
            </button>
          );
        })}
      </div>

      {current && (
        <SectionCard className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-mono font-bold text-sm">{current.key}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{current.label}</span>
          </div>

          {mode === "primaire" ? (
            <>
              <p className="text-sm text-slate-700 dark:text-slate-300">{current.question}</p>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Cochez les signes retrouvés
                </div>
                <div className="space-y-2">
                  {current.signes.map((s, idx) => {
                    const checked = !!(checks[current.key] || {})[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSign(current.key, idx)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors ${
                          checked
                            ? "border-red-500 bg-red-50 dark:bg-red-950/40"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                        }`}
                      >
                        <span
                          className={`shrink-0 grid place-items-center w-6 h-6 rounded-md border-2 ${
                            checked ? "bg-red-500 border-red-500 text-white" : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {checked && <Check size={14} />}
                        </span>
                        <span className="text-sm text-slate-800 dark:text-slate-200">{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {anyChecked(current.key) ? (
                <ResultBanner
                  tone={current.tier === "critique" ? "critical" : "warning"}
                  title={current.tier === "critique" ? "Critique" : "Signe de détresse"}
                  subtitle={current.action}
                />
              ) : isTouched(current.key) ? (
                <ResultBanner tone="ok" title="Normal" subtitle="Aucun signe retrouvé — passer à l'étape suivante." />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{current.detail}</p>
          )}
        </SectionCard>
      )}

      {mode === "primaire" && (
        anyCriticalChecked ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-600 text-white px-4 py-3 flex items-center gap-3">
            <Siren size={22} className="shrink-0" />
            <div>
              <div className="font-bold text-sm">CRITIQUE — 15</div>
              <div className="text-xs opacity-90">Urgent, demander un renfort médicalisé</div>
            </div>
          </div>
        ) : anyDetresseChecked ? (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={22} className="shrink-0" />
            <div>
              <div className="font-bold text-sm">Signe(s) de détresse identifié(s)</div>
              <div className="text-xs opacity-90">Position d'attente adaptée, O2 si nécessaire</div>
            </div>
          </div>
        ) : allTouched ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-600 text-white px-4 py-3 flex items-center gap-3">
            <Check size={22} className="shrink-0" />
            <div>
              <div className="font-bold text-sm">Aucune détresse identifiée</div>
              <div className="text-xs opacity-90">Poursuivre vers le bilan secondaire</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3">
            <Info size={20} className="shrink-0" />
            <div className="text-xs">Cochez les signes présents sur chaque lettre pour obtenir le résultat global.</div>
          </div>
        )
      )}
    </div>
  );
}

function Timeline() {
  return (
    <div className="flex items-center overflow-x-auto no-scrollbar gap-1 py-1">
      {TIMELINE.map((t, i) => (
        <React.Fragment key={t}>
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-emerald-500" : i === 2 ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center w-16 leading-tight">{t}</span>
          </div>
          {i < TIMELINE.length - 1 && <div className="h-px w-4 bg-slate-300 dark:bg-slate-700 shrink-0 -mt-4" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function DecisionSteps({ steps }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
          <div className="flex gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <span className="shrink-0 font-mono text-orange-500 font-bold">{i + 1}.</span>
            <span>{s.q}</span>
          </div>
          {!s.info && (
            <div className="mt-2 grid grid-cols-2 gap-2 pl-5">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 py-2">
                <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">Oui</div>
                <div className="text-xs text-emerald-800 dark:text-emerald-300">{s.oui}</div>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-2">
                <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">Non</div>
                <div className="text-xs text-slate-700 dark:text-slate-300">{s.non}</div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function RachisDecisionTool() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null); // null | "immobilisation" | "pas"
  const [history, setHistory] = useState([]);

  const current = ARBRE_RACHIS_DECISION[step];
  const isLast = step === ARBRE_RACHIS_DECISION.length - 1;

  const answer = (val) => {
    setHistory((h) => [...h, { q: current.q, val }]);
    if (val === "oui") {
      setResult("immobilisation");
    } else if (isLast) {
      setResult("pas");
    } else {
      setStep((s) => s + 1);
    }
  };

  const restart = () => {
    setStep(0);
    setResult(null);
    setHistory([]);
  };

  return (
    <div className="space-y-3">
      {!result && (
        <>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Question {step + 1} / {ARBRE_RACHIS_DECISION.length}
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {current.q}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => answer("oui")}
              className="rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 py-3 font-semibold text-sm text-red-700 dark:text-red-300 active:bg-red-100"
            >
              Oui
            </button>
            <button
              onClick={() => answer("non")}
              className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 py-3 font-semibold text-sm text-emerald-700 dark:text-emerald-300 active:bg-emerald-100"
            >
              Non
            </button>
          </div>
        </>
      )}

      {result === "immobilisation" && (
        <ResultBanner
          tone="critical"
          title="Immobilisation du rachis"
          subtitle="Immobilisation corps entier requise (collier cervical + relevage adapté vers plan dur / MID)."
        />
      )}
      {result === "pas" && (
        <ResultBanner
          tone="ok"
          title="Pas d'immobilisation du rachis"
          subtitle="Aucun critère d'immobilisation retrouvé sur les 4 questions."
        />
      )}

      {history.length > 0 && (
        <div className="space-y-1">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`shrink-0 w-5 h-5 rounded-full grid place-items-center font-bold text-white ${h.val === "oui" ? "bg-red-500" : "bg-emerald-500"}`}>
                {h.val === "oui" ? "O" : "N"}
              </span>
              <span className="truncate">{h.q}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <button
          onClick={restart}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          Recommencer
        </button>
      )}
    </div>
  );
}

function ProtocolsView() {
  const [xabcdeMode, setXabcdeMode] = useState("primaire");
  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <Eyebrow icon={ListChecks}>Arbres & protocoles</Eyebrow>

      <SectionCard className="p-4 space-y-3">
        <Timeline />
      </SectionCard>

      <Accordion id="xabcde" title="Bilan XABCDE" subtitle="Traiter en 1er ce qui tue en 1er · 1'30&quot;" icon={HeartPulse} tone="accent" defaultOpen>
        <XabcdeWheel mode={xabcdeMode} setMode={setXabcdeMode} />
      </Accordion>

      <Accordion id="fiche-aide" title="Fiche d'aide aux bilans" subtitle="Circonstanciel · vital · complémentaire" icon={ClipboardList}>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Bilan circonstanciel</div>
            <ul className="space-y-1.5">
              {FICHE_AIDE_BILANS.circonstanciel.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><span className="text-orange-500 mt-1">•</span><span>{s}</span></li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3">
            <div className="text-xs font-bold uppercase text-red-600 dark:text-red-400">{FICHE_AIDE_BILANS.detresseImmediate.titre}</div>
            <div className="text-xs text-red-500 dark:text-red-400 italic mt-0.5">{FICHE_AIDE_BILANS.detresseImmediate.sous}</div>
            <div className="text-sm text-red-800 dark:text-red-300 mt-1.5">{FICHE_AIDE_BILANS.detresseImmediate.action}</div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
            <div className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">{FICHE_AIDE_BILANS.detresseMoins.titre}</div>
            <div className="text-sm text-amber-800 dark:text-amber-300 mt-1.5">{FICHE_AIDE_BILANS.detresseMoins.action}</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Respiratoire", icon: Wind, items: FICHE_AIDE_BILANS.colonnes.respiratoire },
              { label: "Circulatoire", icon: HeartPulse, items: FICHE_AIDE_BILANS.colonnes.circulatoire },
              { label: "Neurologique", icon: Brain, items: FICHE_AIDE_BILANS.colonnes.neurologique },
            ].map((col) => (
              <div key={col.label} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5">
                  <col.icon size={13} /> {col.label}
                </div>
                <ul className="space-y-1">
                  {col.items.map((it, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2"><span className="text-slate-400 mt-1">•</span><span>{it}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Bilan complémentaire</div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{FICHE_AIDE_BILANS.complementaire.malaise.titre}</div>
              <div className="flex gap-2 mt-1">
                {FICHE_AIDE_BILANS.complementaire.malaise.blocs.map((b) => <Pill key={b}>{b}</Pill>)}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{FICHE_AIDE_BILANS.complementaire.traumatisme.titre}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {FICHE_AIDE_BILANS.complementaire.traumatisme.mecanisme.map((b) => <Pill key={b}>{b}</Pill>)}
              </div>
              <ul className="mt-1.5 space-y-1">
                {FICHE_AIDE_BILANS.complementaire.traumatisme.suite.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2"><span className="text-slate-400 mt-1">•</span><span>{s}</span></li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">{FICHE_AIDE_BILANS.complementaire.avc}</div>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
            <ul className="space-y-1">
              {FICHE_AIDE_BILANS.final.map((s, i) => (
                <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300 flex gap-2 font-medium"><Check size={15} className="shrink-0 mt-0.5" /><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </Accordion>

      <Accordion id="arbres" title="Immobilisation du rachis" subtitle="Questionnaire pas à pas" icon={PersonStanding} tone="critical">
        <RachisDecisionTool />
      </Accordion>

      <Accordion title="Mécanismes accidentels à haut risque rachis" subtitle="Intervention pas à pas" icon={RadioTower} tone="critical">
        <div className="space-y-3">
          <div className="flex gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
            <Info size={16} className="shrink-0 mt-0.5 text-orange-500" />
            <span>{ARBRE_NOTE}</span>
          </div>
          <DecisionSteps steps={ARBRE_INTERVENTION_RACHIS} />
        </div>
      </Accordion>

      <Accordion id="outils" title="Boîte à outils" subtitle="Valeurs de référence & mnémotechniques" icon={Gauge}>
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[420px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 pr-2">Paramètre</th>
                  <th className="py-1.5 pr-2">Adulte</th>
                  <th className="py-1.5 pr-2">Enfant</th>
                  <th className="py-1.5">Nourrisson</th>
                </tr>
              </thead>
              <tbody>
                {REF_VALUES.map((r) => (
                  <tr key={r.label} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-200">{r.label}</td>
                    <td className="py-2 pr-2 font-mono text-slate-700 dark:text-slate-300">{r.adulte}</td>
                    <td className="py-2 pr-2 font-mono text-slate-700 dark:text-slate-300">{r.enfant}</td>
                    <td className="py-2 font-mono text-slate-700 dark:text-slate-300">{r.nourrisson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              <div className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 mb-1">Hypoglycémie</div>
              <div className="text-xs text-amber-800 dark:text-amber-300 font-mono">{GLYCEMIE.hypo}</div>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              <div className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 mb-1">Hyperglycémie</div>
              <div className="text-xs text-amber-800 dark:text-amber-300 font-mono">{GLYCEMIE.hyper}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {MNEMONICS.map((m) => (
              <div key={m.code} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono font-black text-orange-600 dark:text-orange-400 text-sm">{m.code}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">— {m.desc}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.full.map((f) => <Pill key={f}>{f}</Pill>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Accordion>
    </div>
  );
}

/* ============================================================
   APP — SHELL & NAVIGATION
   ============================================================ */

export default function App() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const { favorites, toggle } = useFavorites();

  const handleNavigate = (targetTab, anchor) => {
    setTab(targetTab);
    setQuery("");
    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const NAV = [
    { key: "search", label: "Recherche", icon: Search },
    { key: "calc", label: "Calculateurs", icon: Calculator },
    { key: "protocols", label: "Protocoles", icon: ListChecks },
  ];

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <header className="sticky top-0 z-20 bg-stone-50/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-orange-500 text-white">
                <Stethoscope size={18} />
              </span>
              <div className="leading-tight">
                <div className="font-black text-sm tracking-tight">SDIS 76 · Bilans</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Protocoles &amp; scores terrain</div>
              </div>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="w-9 h-9 grid place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Basculer le thème"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24 max-w-lg w-full mx-auto">
          {tab === "search" && <SearchView query={query} setQuery={setQuery} favorites={favorites} toggleFavorite={toggle} onNavigate={handleNavigate} />}
          {tab === "calc" && <CalcView />}
          {tab === "protocols" && <ProtocolsView />}
        </main>

        <nav className="fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-lg mx-auto grid grid-cols-3">
            {NAV.map((n) => {
              const active = tab === n.key;
              const Icon = n.icon;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                    active ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
