# 18. Dogal Ses Uretim Akisi

Bu akis PDF kitaplarin Web Speech API yerine onceden uretilmis dogal ses dosyalariyla dinlenebilmesi icindir. Canli TTS yapilmaz; ses bir kere uretilir, Firebase Storage'a yuklenir ve dinleyiciler hazir dosyayi oynatir.

## Ana Karar

```text
PDF -> book_text_chunks -> local TTS worker -> natural_audio Storage dosyalari -> chapters -> Blind Mode audio playback
```

Admin bilgisayari veya ekipteki bir makine sadece uretim sirasinda acik kalir. Ses dosyalari Storage'a yuklendikten sonra dinleme icin bu makinenin acik kalmasi gerekmez.

## Firestore Durumlari

`books/{bookId}.naturalAudio.status`:

| Deger | Anlam |
| --- | --- |
| `not_requested` | Dogal ses istenmedi. |
| `queued` | Worker tarafindan alinmayi bekliyor. |
| `processing` | Worker ses uretiyor. |
| `ready` | Ses dosyalari hazir, Blind Mode bunlari oynatir. |
| `failed` | Uretim hata verdi. |

PDF kitap onaylanirken admin panelindeki `YayÄ±nlayÄ±nca doÄŸal ses Ã¼retim kuyruÄŸuna al` secenegi aciksa kitap `queued` olur.

## Worker Calistirma

Worker sahte ses uretmez. Gercek bir TTS komutu baglanmadigi surece calismaz.

### Piper ile hizli pilot

Bu makinede ilk pilot icin workspace icinde `.venv` olusturuldu, `piper-tts` kuruldu ve Turkce `tr_TR-dfki-medium` sesi `models/piper` altina indirildi. Bu dosyalar buyuk/yerel oldugu icin Git'e alinmaz.

Tek parca yerel test:

```powershell
.\.venv\Scripts\python.exe -m piper `
  -m .\models\piper\tr_TR-dfki-medium.onnx `
  -c .\models\piper\tr_TR-dfki-medium.onnx.json `
  -i .\samples\natural-audio-pilot.txt `
  -f .\artifacts\natural-audio\pilot-tr-piper.wav
```

Worker icin Piper komutu:

```powershell
$env:NATURAL_TTS_COMMAND='.\.venv\Scripts\python.exe -m piper -m .\models\piper\tr_TR-dfki-medium.onnx -c .\models\piper\tr_TR-dfki-medium.onnx.json -i {input} -f {output}'
$env:NATURAL_TTS_OUTPUT_EXT="wav"
$env:NATURAL_TTS_PROVIDER="piper_tr_TR_dfki_medium"
```

Piper CPU'da pratik ve ucretsizdir. Ses kalitesi XTTS/ElevenLabs kadar duygulu olmayabilir, ama ilk urun pilotu icin hizli ve maliyetsiz bir taban saglar.

Worker'i tek komutla calistirmak icin:

```powershell
.\scripts\run-natural-audio-worker.ps1
```

Varsayilanlar:

- Service account: `secrets/firebase-adminsdk.json`
- Bucket: `gtu-echovoices.firebasestorage.app`
- Ilk deneme chunk limiti: `3`

Service account JSON repo icine commit edilmez. `secrets/` klasoru `.gitignore` altindadir.

### XTTS ile daha dogal ses denemesi

Gerekli ortam degiskenleri:

```powershell
$env:FIREBASE_STORAGE_BUCKET="proje-bucket.appspot.com"
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\service-account.json"
$env:NATURAL_TTS_COMMAND='python scripts/xtts-generate.py --text-file {input} --out {output} --lang {language} --speaker-wav C:\voices\approved-reader.wav --cpu'
$env:NATURAL_TTS_OUTPUT_EXT="wav"
$env:NATURAL_TTS_PROVIDER="xtts_v2_local"
$env:NATURAL_TTS_VOICE_ID="default_tr"
npm run natural-audio:worker
```

`{input}`, `{output}`, `{language}` ve `{voice}` worker tarafindan doldurulur.

## Dinleyici Davranisi

- `naturalAudio.status == "ready"` olan PDF kitaplar Blind Mode'da ses dosyasi gibi calar.
- Dogal ses hazir degilse mevcut Web Speech fallback korunur.
- Ses parcalari `chapters` koleksiyonuna `readingMode: "audio_file"` ve `status: "published"` olarak yazilir.

## Ilk Pilot

Ilk testte `NATURAL_AUDIO_CHUNK_LIMIT=3` ile baslamak daha guvenlidir. Kalite, dosya boyutu ve Turkce telaffuz onaylandiktan sonra limit arttirilabilir.
