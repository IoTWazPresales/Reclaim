/**
 * Governed catalog seed batch 4 — specialty + common gap fills (no overlap with v1/batch1–3).
 * Run: node scripts/generateMedCatalogBatch4.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'data', 'medCatalog.batch4.json');

const SN =
  'Reclaim MedicationKnowledge V1 batch 4 seed; specialty and gap-fill generics for educational context in-app.';
const SAFETY = 'Educational only. Not medical advice. Discuss changes with your clinician.';
const WYM = [
  'Effects vary widely between individuals and formulations.',
  'Timing can influence fatigue, sleep quality, and same-day alertness.',
];

function entry({
  id,
  genericName,
  brandNames = [],
  matchAliases = [],
  category,
  medicationClass,
  mechanism,
  plainEnglishMechanism,
  commonUses,
  confidence = 0.74,
  effectTags,
  stateImpactTags,
}) {
  return {
    id,
    genericName,
    brandNames,
    ...(matchAliases.length ? { matchAliases } : {}),
    category,
    medicationClass,
    activeIngredients: [genericName],
    mechanism,
    ...(plainEnglishMechanism ? { plainEnglishMechanism } : {}),
    ...(commonUses ? { commonUses } : {}),
    whatYouMightNotice: WYM,
    confidence,
    safetyNote: SAFETY,
    sourceNote: SN,
    effectTags,
    stateImpactTags,
  };
}

/** [id, generic, brands, aliases, category, class, mechanism, confidence, effectTags, stateTags, plain?, uses?] */
const DEFS = [
  ['desogestrel', 'Desogestrel', ['Cerazette'], [], 'hormonal_contraceptive', 'Progestin contraceptive', 'Progestin that suppresses ovulation in many contraceptive plans; mood and spotting variability is individual.', 0.74, ['mood_relevant'], ['mood_context'], null, ['Contraception']],
  ['ethinylestradiol_levonorgestrel', 'Ethinylestradiol / levonorgestrel', ['Seasonale', 'Levora'], ['Combined oral contraceptive'], 'hormonal_contraceptive', 'Combined oral contraceptive', 'Estrogen-progestin combination that prevents ovulation; headache and mood variability context exists for some users.', 0.75, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, ['Contraception']],
  ['lacosamide', 'Lacosamide', ['Vimpat'], [], 'anticonvulsant', 'Anticonvulsant', 'Enhances slow inactivation of sodium channels in selected seizure plans.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['brivaracetam', 'Brivaracetam', ['Briviact'], [], 'anticonvulsant', 'Anticonvulsant', 'SV2A-related anticonvulsant used in selected epilepsy plans; sedation context for some users.', 0.73, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['eslicarbazepine', 'Eslicarbazepine', ['Aptiom'], ['Eslicarbazepine acetate'], 'anticonvulsant', 'Anticonvulsant', 'Sodium-channel related therapy in epilepsy plans; dizziness context may affect same-day readiness.', 0.72, ['fatigue_relevant', 'training_readiness_relevant'], ['fatigue_context', 'training_readiness'], null, null],
  ['perampanel', 'Perampanel', ['Fycompa'], [], 'anticonvulsant', 'AMPA receptor antagonist', 'AMPA antagonism used in seizure plans; mood and sleep-related labeling discussions exist.', 0.72, ['mood_relevant', 'sleep_relevant'], ['mood_context', 'sleep_interpretation'], null, null],
  ['rufinamide', 'Rufinamide', ['Banzel'], [], 'anticonvulsant', 'Anticonvulsant', 'Sodium-channel related option used in specific epilepsy syndromes.', 0.71, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['clobazam', 'Clobazam', ['Onfi', 'Sympazan'], [], 'benzodiazepine', 'Benzodiazepine anticonvulsant', 'Benzodiazepine used in selected seizure plans; sedation and next-day grogginess context is common.', 0.76, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['stiripentol', 'Stiripentol', ['Diacomit'], [], 'anticonvulsant', 'Anticonvulsant', 'Used in specific epilepsy syndromes; appetite and sedation context appear in labeling.', 0.7, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['fenfluramine', 'Fenfluramine', ['Fintepla'], [], 'anticonvulsant', 'Serotonin-modulating anticonvulsant', 'Serotonergic pathway effects in selected epilepsy plans; cardiovascular monitoring context in labeling.', 0.7, ['appetite_relevant', 'fatigue_relevant'], ['appetite_context', 'fatigue_context'], null, null],
  ['cannabidiol_epidiolex', 'Cannabidiol (Epidiolex)', ['Epidiolex'], ['CBD oral solution prescription'], 'anticonvulsant', 'Purified CBD oral solution', 'Prescription purified CBD used in specific epilepsy syndromes; sedation and liver-enzyme context discussed clinically.', 0.72, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['sodium_oxybate', 'Sodium oxybate', ['Xyrem', 'Xywav'], [], 'sleep_medication', 'CNS depressant for narcolepsy plans', 'Deeply sedating nighttime therapy in selected narcolepsy plans; next-day alertness context is individual.', 0.74, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['tasimelteon', 'Tasimelteon', ['Hetlioz'], [], 'sleep_medication', 'Melatonin receptor agonist', 'Melatonin-receptor therapy used in selected circadian rhythm disorder plans.', 0.71, ['sleep_relevant'], ['sleep_interpretation'], null, null],
  ['brexanolone', 'Brexanolone', ['Zulresso'], [], 'antidepressant', 'Neuroactive steroid', 'IV neurosteroid used in selected postpartum depression plans in clinical settings.', 0.7, ['mood_relevant', 'sleep_relevant'], ['mood_context', 'sleep_interpretation'], null, null],
  ['zuranolone', 'Zuranolone', ['Zurzuvae'], [], 'antidepressant', 'Neuroactive steroid', 'Oral neurosteroid used in selected postpartum depression plans; sedation context is prominent.', 0.71, ['mood_relevant', 'sleep_relevant', 'fatigue_relevant'], ['mood_context', 'sleep_interpretation', 'fatigue_context'], null, null],
  ['deutetrabenazine', 'Deutetrabenazine', ['Austedo'], [], 'movement_disorder', 'VMAT2 inhibitor', 'Reduces vesicular monoamine transport in selected movement-disorder plans; depression-monitoring context in labeling.', 0.72, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  ['valbenazine', 'Valbenazine', ['Ingrezza'], [], 'movement_disorder', 'VMAT2 inhibitor', 'VMAT2 inhibition for tardive dyskinesia–related plans.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['primidone', 'Primidone', ['Mysoline'], [], 'anticonvulsant', 'Barbiturate-related anticonvulsant', 'Converted in part to phenobarbital; sedation and coordination context for training days.', 0.73, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['leflunomide', 'Leflunomide', ['Arava'], [], 'dmard', 'DMARD', 'Inhibits pyrimidine synthesis in selected autoimmune plans; fatigue context varies.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['azathioprine', 'Azathioprine', ['Imuran', 'Azasan'], [], 'immunosuppressant', 'Purine antimetabolite', 'Suppresses lymphocyte proliferation in selected autoimmune and transplant-related plans.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['mycophenolate', 'Mycophenolate', ['CellCept', 'Myfortic'], ['Mycophenolate mofetil'], 'immunosuppressant', 'Inosine monophosphate dehydrogenase inhibitor', 'Limits lymphocyte proliferation in transplant and autoimmune contexts.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['tacrolimus', 'Tacrolimus', ['Prograf', 'Astagraf'], [], 'immunosuppressant', 'Calcineurin inhibitor', 'Calcineurin inhibition used in transplant and selected dermatologic plans; tremor and sleep disruption context for some.', 0.74, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['sirolimus', 'Sirolimus', ['Rapamune'], [], 'immunosuppressant', 'mTOR inhibitor', 'mTOR pathway inhibition in transplant-related plans; mouth sores and fatigue context discussed clinically.', 0.71, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['everolimus', 'Everolimus', ['Afinitor', 'Zortress'], [], 'immunosuppressant', 'mTOR inhibitor', 'mTOR inhibition used across transplant and selected oncology plans.', 0.71, ['fatigue_relevant', 'appetite_relevant'], ['fatigue_context', 'appetite_context'], null, null],
  ['dabigatran', 'Dabigatran', ['Pradaxa'], [], 'anticoagulant', 'Direct thrombin inhibitor', 'Oral anticoagulant that inhibits thrombin; bleeding-risk context is clinically central.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['prasugrel', 'Prasugrel', ['Effient'], [], 'antiplatelet', 'P2Y12 inhibitor', 'Antiplatelet therapy used after selected cardiac events; bruising context is common.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['ticagrelor', 'Ticagrelor', ['Brilinta'], [], 'antiplatelet', 'P2Y12 inhibitor', 'Reversible P2Y12 inhibition used in selected ACS-related plans; dyspnea context for some users.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['risedronate', 'Risedronate', ['Actonel'], [], 'bone_health', 'Bisphosphonate', 'Reduces bone resorption in osteoporosis-related plans; dosing timing relative to food matters.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['denosumab', 'Denosumab', ['Prolia', 'Xgeva'], [], 'bone_health', 'RANKL inhibitor', 'Antibody against RANKL used in osteoporosis and oncology bone-related plans.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['teriparatide', 'Teriparatide', ['Forteo'], [], 'bone_health', 'PTH analog', 'Anabolic bone therapy injected in selected osteoporosis plans.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['dutasteride', 'Dutasteride', ['Avodart'], [], 'urologic', '5-alpha reductase inhibitor', 'Blocks conversion of testosterone to DHT in BPH-related plans.', 0.74, ['mood_relevant'], ['mood_context'], null, null],
  ['salmeterol', 'Salmeterol', ['Serevent'], [], 'respiratory', 'Long-acting beta agonist', 'Long-acting bronchodilation in asthma/COPD-related plans; jitteriness context for some.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['erenumab', 'Erenumab', ['Aimovig'], [], 'migraine', 'CGRP monoclonal antibody', 'Monthly CGRP blockade used in migraine prevention plans.', 0.73, ['fatigue_relevant', 'mood_relevant'], ['fatigue_context', 'mood_context'], null, ['Migraine prevention']],
  ['fremanezumab', 'Fremanezumab', ['Ajovy'], [], 'migraine', 'CGRP monoclonal antibody', 'CGRP monoclonal used for migraine prevention; injection-site reactions possible.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['febuxostat', 'Febuxostat', ['Uloric'], [], 'gout', 'Xanthine oxidase inhibitor', 'Lowers uric acid production in gout-related plans.', 0.72, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['prochlorperazine', 'Prochlorperazine', ['Compazine'], [], 'antiemetic', 'Phenothiazine antiemetic', 'Dopamine blockade used for nausea; sedation and restlessness context for some.', 0.73, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['minocycline', 'Minocycline', ['Minocin', 'Solodyn'], [], 'antibiotic', 'Tetracycline antibiotic', 'Broad antibiotic used across acne and infection plans; vestibular effects possible.', 0.74, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['isotretinoin', 'Isotretinoin', ['Accutane', 'Absorica'], [], 'dermatologic', 'Systemic retinoid', 'Systemic retinoid for severe acne plans; mood and dryness monitoring context in labeling.', 0.74, ['mood_relevant'], ['mood_context'], null, null],
  ['tretinoin_topical', 'Tretinoin', ['Retin-A', 'Altreno'], [], 'dermatologic', 'Topical retinoid', 'Topical vitamin A derivative used in acne and photoaging plans; irritation is common early.', 0.75, ['mood_relevant'], ['mood_context'], null, null],
  ['adapalene', 'Adapalene', ['Differin'], [], 'dermatologic', 'Topical retinoid', 'Topical retinoid commonly used in acne plans.', 0.74, ['mood_relevant'], ['mood_context'], null, null],
  ['naltrexone', 'Naltrexone', ['ReVia', 'Vivitrol'], [], 'substance_use', 'Opioid antagonist', 'Blocks opioid receptors; used in alcohol- and opioid-use–related plans.', 0.74, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
  ['ulipristal', 'Ulipristal', ['Ella'], ['Ulipristal acetate'], 'hormonal_therapy', 'Selective progesterone receptor modulator', 'Emergency contraception and selected fibroid-related plans; timing relative to ovulation matters.', 0.72, ['mood_relevant'], ['mood_context'], null, null],
  ['letrozole', 'Letrozole', ['Femara'], [], 'hormonal_therapy', 'Aromatase inhibitor', 'Aromatase inhibition used in selected breast-cancer and fertility-related plans.', 0.73, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['riluzole', 'Riluzole', ['Rilutek', 'Exservan'], [], 'neurology_adjunct', 'Glutamate modulator', 'Used in ALS-related plans; fatigue and liver-enzyme monitoring context in labeling.', 0.71, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['acamprosate', 'Acamprosate', ['Campral'], [], 'substance_use', 'Glutamate modulator', 'Supports alcohol-use recovery plans via glutamate/GABA balance context.', 0.72, ['mood_relevant'], ['mood_context'], null, null],
  ['methadone', 'Methadone', ['Dolophine', 'Methadose'], [], 'substance_use', 'Long-acting opioid agonist', 'Long-acting opioid used in opioid-use disorder and pain plans; sedation and QT context are clinically important.', 0.74, ['sleep_relevant', 'fatigue_relevant'], ['sleep_interpretation', 'fatigue_context'], null, null],
  ['naloxone', 'Naloxone', ['Narcan', 'Evzio'], [], 'substance_use', 'Opioid antagonist (rescue)', 'Rapidly reverses opioid effects in emergency rescue contexts; not a daily wellness medication.', 0.76, ['fatigue_relevant'], ['fatigue_context'], null, null],
  ['drospirenone', 'Drospirenone', ['Slynd'], [], 'hormonal_contraceptive', 'Progestin contraceptive', 'Progestin used alone or in combination contraceptives; mood variability is individual.', 0.73, ['mood_relevant'], ['mood_context'], null, null],
  ['etonogestrel', 'Etonogestrel', ['Nexplanon', 'Implanon'], [], 'hormonal_contraceptive', 'Progestin implant', 'Long-acting progestin implant for contraception; spotting and mood context vary.', 0.74, ['mood_relevant'], ['mood_context'], null, null],
  ['medroxyprogesterone', 'Medroxyprogesterone', ['Depo-Provera', 'Provera'], [], 'hormonal_therapy', 'Progestin', 'Injectable or oral progestin used in contraception and gynecologic plans.', 0.74, ['mood_relevant', 'fatigue_relevant'], ['mood_context', 'fatigue_context'], null, null],
];

const rows = DEFS.map((d) =>
  entry({
    id: d[0],
    genericName: d[1],
    brandNames: d[2],
    matchAliases: d[3],
    category: d[4],
    medicationClass: d[5],
    mechanism: d[6],
    confidence: d[7],
    effectTags: d[8],
    stateImpactTags: d[9],
    plainEnglishMechanism: d[10] || undefined,
    commonUses: d[11] || undefined,
  }),
);

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
console.log(`Wrote ${rows.length} entries → ${outPath}`);
