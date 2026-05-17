param(
  [string]$ServiceAccountPath = "secrets/firebase-adminsdk.json",
  [string]$StorageBucket = "gtu-echovoices.firebasestorage.app",
  [int]$ChunkLimit = 3,
  [string]$Provider = "piper_tr_TR_dfki_medium"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serviceAccountFullPath = Join-Path $root $ServiceAccountPath
$pythonPath = Join-Path $root ".venv\Scripts\python.exe"
$piperModelPath = Join-Path $root "models\piper\tr_TR-dfki-medium.onnx"
$piperConfigPath = Join-Path $root "models\piper\tr_TR-dfki-medium.onnx.json"

if (!(Test-Path $serviceAccountFullPath)) {
  throw "Firebase service account JSON bulunamadi: $serviceAccountFullPath"
}

if (!(Test-Path $pythonPath)) {
  throw "Python venv bulunamadi: $pythonPath"
}

if (!(Test-Path $piperModelPath) -or !(Test-Path $piperConfigPath)) {
  throw "Piper Turkce model dosyalari bulunamadi. Once piper modeli indirilmeli."
}

$env:GOOGLE_APPLICATION_CREDENTIALS = $serviceAccountFullPath
$env:FIREBASE_STORAGE_BUCKET = $StorageBucket
$env:NATURAL_AUDIO_CHUNK_LIMIT = "$ChunkLimit"
$env:NATURAL_TTS_OUTPUT_EXT = "wav"
$env:NATURAL_TTS_PROVIDER = $Provider
$env:NATURAL_TTS_VOICE_ID = "tr_TR-dfki-medium"
$env:NATURAL_TTS_COMMAND = ".\.venv\Scripts\python.exe -m piper -m .\models\piper\tr_TR-dfki-medium.onnx -c .\models\piper\tr_TR-dfki-medium.onnx.json -i {input} -f {output}"

Push-Location $root
try {
  npm.cmd run natural-audio:worker
} finally {
  Pop-Location
}
