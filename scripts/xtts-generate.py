import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Generate one natural-audio file with Coqui XTTS v2.")
    parser.add_argument("--text-file", required=True, help="UTF-8 text file to synthesize.")
    parser.add_argument("--out", required=True, help="Output audio path, usually .wav.")
    parser.add_argument("--lang", default="tr", help="XTTS language code. Use tr for Turkish.")
    parser.add_argument(
        "--speaker-wav",
        default="",
        help="Clean reference speaker WAV. Required for a stable production voice.",
    )
    parser.add_argument(
        "--model",
        default="tts_models/multilingual/multi-dataset/xtts_v2",
        help="Coqui model name.",
    )
    parser.add_argument("--cpu", action="store_true", help="Run without CUDA.")
    args = parser.parse_args()

    text = Path(args.text_file).read_text(encoding="utf-8").strip()
    if not text:
        raise SystemExit("Input text is empty.")

    if not args.speaker_wav:
        raise SystemExit("--speaker-wav is required. Use an approved, consented reference voice.")

    try:
        from TTS.api import TTS
    except ImportError as exc:
        raise SystemExit(
            "Coqui TTS is not installed. Install it in a separate Python environment before running this worker."
        ) from exc

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    tts = TTS(args.model, gpu=not args.cpu)
    tts.tts_to_file(
        text=text,
        speaker_wav=args.speaker_wav,
        language=args.lang,
        file_path=str(output_path),
    )


if __name__ == "__main__":
    main()
