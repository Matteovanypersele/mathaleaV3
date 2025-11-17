import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { setOutputHtml, setOutputLatex, setOutputAmc } from '../src/modules/context.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const exercicesListPath = path.join(rootDir, 'src', 'exercicesList.json')

function getArg(name, defaultValue = undefined) {
  const flag = `--${name}`
  const argIndex = process.argv.findIndex((arg) => arg === flag)
  if (argIndex !== -1 && process.argv[argIndex + 1] && !process.argv[argIndex + 1].startsWith('--')) {
    return process.argv[argIndex + 1]
  }
  const withEquals = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (withEquals) {
    return withEquals.substring(withEquals.indexOf('=') + 1)
  }
  return defaultValue
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function loadExercisesList() {
  if (!fs.existsSync(exercicesListPath)) {
    throw new Error(`Impossible de trouver la liste des exercices : ${exercicesListPath}`)
  }
  const raw = await fs.promises.readFile(exercicesListPath, 'utf8')
  return JSON.parse(raw)
}

function selectOutputMode(format) {
  switch (format) {
    case 'latex':
      setOutputLatex()
      break
    case 'amc':
      setOutputAmc()
      break
    default:
      setOutputHtml()
      break
  }
}

function deriveNiveau(relativePath) {
  const segments = relativePath.split('/')
  if (segments.length === 0) return ''
  if (segments[0] === 'can' && segments.length > 1) {
    return `can-${segments[1]}`
  }
  return segments[0]
}

function buildExerciseMetadata(module, relativePath) {
  return {
    titre: module.titre ?? module.default?.titre ?? '',
    ref: module.ref ?? null,
    uuid: module.uuid ?? null,
    interactifReady: module.interactifReady ?? module.default?.interactifReady ?? false,
    interactifType: module.interactifType ?? module.default?.interactifType ?? null,
    amcReady: module.amcReady ?? module.default?.amcReady ?? false,
    amcType: module.amcType ?? module.default?.amcType ?? null,
    path: relativePath
  }
}

async function generateSamples(ExerciseClass, meta, perExercise) {
  const samples = []
  for (let i = 0; i < perExercise; i++) {
    const exercice = new ExerciseClass()
    if (meta.titre && !exercice.titre) exercice.titre = meta.titre
    exercice.numeroExercice = i + 1
    exercice.id = meta.uuid || meta.ref || `${meta.path}#${i + 1}`
    if (typeof exercice.applyNewSeed === 'function') {
      exercice.applyNewSeed()
    }
    if (typeof exercice.nouvelleVersion !== 'function') {
      throw new Error('Méthode nouvelleVersion absente sur cet exercice')
    }
    const maybePromise = exercice.nouvelleVersion(exercice.numeroExercice)
    if (maybePromise && typeof maybePromise.then === 'function') {
      await maybePromise
    }
    samples.push({
      seed: exercice.seed ?? null,
      consigne: exercice.consigne ?? '',
      questions: exercice.listeQuestions ?? [],
      corrections: exercice.listeCorrections ?? [],
      enonceHtml: exercice.contenu ?? '',
      correctionHtml: exercice.contenuCorrection ?? '',
      autoCorrection: exercice.autoCorrection ?? []
    })
  }
  return samples
}

async function loadExerciseModule(relativePath) {
  const fullPath = path.join(rootDir, 'src', 'exercices', relativePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fichier introuvable : ${fullPath}`)
  }
  const moduleUrl = pathToFileURL(fullPath).href
  return import(moduleUrl)
}

async function buildDataset({ perExercise, limit, format }) {
  selectOutputMode(format)
  const exercicesList = await loadExercisesList()
  const dataset = []
  const failures = []
  let totalSamples = 0
  let processed = 0
  let visited = 0
  for (const relativePath of exercicesList) {
    if (limit > 0 && visited >= limit) break
    visited++
    let module
    try {
      module = await loadExerciseModule(relativePath)
    } catch (error) {
      failures.push({ path: relativePath, error: error.message })
      continue
    }
    const ExerciseClass = module.default
    if (typeof ExerciseClass !== 'function') {
      failures.push({ path: relativePath, error: 'Module sans export par défaut exploitable.' })
      continue
    }
    const meta = buildExerciseMetadata(module, relativePath)
    let samples
    try {
      samples = await generateSamples(ExerciseClass, meta, perExercise)
    } catch (error) {
      failures.push({ path: relativePath, error: error.message })
      continue
    }
    processed++
    totalSamples += samples.length
    dataset.push({
      ...meta,
      niveau: deriveNiveau(relativePath),
      samples
    })
    process.stdout.write(`\rExercices traités : ${processed} | Échantillons : ${totalSamples}`)
  }
  process.stdout.write('\n')
  return { dataset, failures, stats: { exercices: processed, samples: totalSamples, visites: visited } }
}

async function main() {
  const perExercise = parsePositiveInt(getArg('perExercise', '1'), 1)
  const limit = parsePositiveInt(getArg('limit', '0'), 0)
  const format = (getArg('format', 'html') || 'html').toLowerCase()
  const outputArg = getArg('output', path.join('src', 'json', 'exercisesDataset.json'))
  const outputPath = path.isAbsolute(outputArg) ? outputArg : path.join(rootDir, outputArg)
  const { dataset, failures, stats } = await buildDataset({ perExercise, limit, format })
  const payload = {
    generatedAt: new Date().toISOString(),
    format,
    perExercise,
    stats,
    failures,
    exercises: dataset
  }
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`\nDataset enregistré dans ${outputPath}`)
  if (failures.length) {
    console.warn(`Attention : ${failures.length} exercices n'ont pas pu être générés.`)
  }
}

main().catch((error) => {
  console.error('Erreur lors de la génération du dataset :', error)
  process.exit(1)
})
